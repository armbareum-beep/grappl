import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Button } from './Button';
import { Loader, Scissors, Play, Pause, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface VideoTrimmerProps {
    file: File;
    onSave: (trimmedBlob: Blob) => void;
    onCancel: () => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ file, onSave, onCancel }) => {
    const [loaded, setLoaded] = useState(false);
    const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('로드 중...');

    // Video State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Trim State
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(60); // Default 1 minute

    const { error: toastError } = useToast();

    const load = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });

        try {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setFfmpeg(ffmpeg);
            setLoaded(true);
        } catch (err) {
            console.error('FFmpeg load error:', err);
            toastError('동영상 처리 엔진을 로드하는데 실패했습니다. (SharedArrayBuffer 지원 필요)');
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
            // Cap default end time to duration
            if (videoRef.current.duration < 60) {
                setEndTime(videoRef.current.duration);
            }
        }
    }, [videoRef.current?.duration]);

    const handleTrim = async () => {
        if (!ffmpeg || !loaded) return;
        setIsProcessing(true);
        setMessage('미리보기 추출 중... (잠시만 기다려주세요)');

        try {
            const inputName = 'input.mp4';
            const outputName = 'output.mp4';

            await ffmpeg.writeFile(inputName, await fetchFile(file));

            const duration = endTime - startTime;
            if (duration <= 0) throw new Error('잘못된 구간입니다.');

            // Fast seeking with -ss before -i may be less accurate but faster. 
            // For precision we might put -ss after -i, but it is slower.
            // Using re-encoding to ensure compatibility.
            // Command: ffmpeg -i input.mp4 -ss START -t DURATION -c copy output.mp4
            // Note: -c copy is fast but expects keyframes. Re-encoding is safer for arbitrary cuts.
            // Let's try re-encoding with a fast preset for compatibility.
            await ffmpeg.exec([
                '-i', inputName,
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-c:v', 'libx264',
                '-preset', 'ultrafast', // Fast encoding
                '-c:a', 'aac',
                outputName
            ]);

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([(data as any).buffer], { type: 'video/mp4' });

            onSave(blob);

        } catch (err) {
            console.error(err);
            toastError('영상 추출 실패');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const curr = videoRef.current.currentTime;
            setCurrentTime(curr);

            // Stop if passed end time
            if (isPlaying && curr >= endTime) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            // If at end, restart from start
            if (currentTime >= endTime) {
                videoRef.current.currentTime = startTime;
            }
            // If before start, jump to start
            if (currentTime < startTime) {
                videoRef.current.currentTime = startTime;
            }
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const [videoSrc, setVideoSrc] = useState<string>('');

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    return (
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex flex-col max-h-[80vh]">
            <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center">
                {!loaded && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white">
                        <Loader className="w-8 h-8 animate-spin mb-2" />
                        <p>{message}</p>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 text-white">
                        <Scissors className="w-10 h-10 animate-bounce mb-4 text-violet-500" />
                        <p className="font-bold text-lg">{message}</p>
                        <p className="text-zinc-400 text-sm mt-2">브라우저를 닫지 마세요</p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    src={videoSrc}
                    className="max-h-full max-w-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>

            <div className="p-6 space-y-6 bg-zinc-900">
                {/* Timeline Controls */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-400 font-mono">
                        <span>{formatTime(startTime)}</span>
                        <span>{formatTime(endTime)} ({Math.round(endTime - startTime)}s)</span>
                    </div>

                    {/* Simple Range Slider (Could be better UI but functional) */}
                    <div className="relative h-12 bg-zinc-800 rounded-lg overflow-hidden">
                        {/* Track */}
                        <div
                            className="absolute top-0 bottom-0 bg-violet-500/30 border-l-2 border-r-2 border-violet-500"
                            style={{
                                left: `${(startTime / duration) * 100}%`,
                                width: `${((endTime - startTime) / duration) * 100}%`
                            }}
                        />
                        {/* Playhead */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        />

                        <input
                            type="range"
                            min="0"
                            max={duration}
                            step="1"
                            value={startTime}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val < endTime) setStartTime(val);
                            }}
                            className="absolute inset-x-0 top-0 h-6 opacity-0 cursor-pointer z-20"
                            title="시작 지점"
                        />
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            step="1"
                            value={endTime}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val > startTime) setEndTime(val);
                            }}
                            className="absolute inset-x-0 bottom-0 h-6 opacity-0 cursor-pointer z-20"
                            title="종료 지점"
                        />
                    </div>

                    <div className="flex gap-4 items-center justify-center mt-4">
                        <Button variant="secondary" onClick={() => {
                            setStartTime(currentTime);
                        }}>
                            현재 위치를 시작점으로
                        </Button>
                        <button
                            onClick={togglePlay}
                            className="p-4 bg-violet-600 rounded-full hover:bg-violet-500 transition-colors"
                        >
                            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
                        </button>
                        <Button variant="secondary" onClick={() => {
                            setEndTime(currentTime);
                        }}>
                            현재 위치를 종료점으로
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
                        취소
                    </Button>
                    <Button
                        onClick={handleTrim}
                        disabled={isProcessing || !loaded}
                        className="bg-violet-600 hover:bg-violet-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        미리보기 생성 및 업로드
                    </Button>
                </div>
            </div>
        </div>
    );
};
