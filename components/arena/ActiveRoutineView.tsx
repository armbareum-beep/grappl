import React, { useState, useEffect } from 'react';
import { DrillRoutine } from '../../types';
import { X, Play, Pause, Square, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../Button';

interface ActiveRoutineViewProps {
    routine: DrillRoutine;
    onComplete: (durationSeconds: number) => void;
    onCancel: () => void;
}

export const ActiveRoutineView: React.FC<ActiveRoutineViewProps> = ({ routine, onComplete, onCancel }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(true);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndRoutine = () => {
        setIsRunning(false);
        if (confirm('루틴을 종료하고 기록을 저장하시겠습니까?')) {
            onComplete(elapsedSeconds);
        } else {
            setIsRunning(true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg">{routine.title}</h2>
                        <p className="text-slate-400 text-xs">루틴 진행 중</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (confirm('루틴을 취소하시겠습니까? 기록이 저장되지 않습니다.')) {
                            onCancel();
                        }
                    }}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Timer Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Background Pulse Effect */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`w-64 h-64 rounded-full bg-purple-600/5 blur-[100px] transition-all duration-1000 ${isRunning ? 'scale-110 opacity-100' : 'scale-100 opacity-50'}`} />
                </div>

                <div className="relative z-10 text-center space-y-8">
                    <div className="space-y-2">
                        <div className="text-slate-400 text-sm uppercase tracking-widest font-medium">Total Time</div>
                        <div className="text-8xl font-black text-white tabular-nums tracking-tight">
                            {formatTime(elapsedSeconds)}
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setIsRunning(!isRunning)}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRunning
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
                                }`}
                        >
                            {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>

                        <Button
                            onClick={handleEndRoutine}
                            className="h-16 px-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg shadow-red-900/20 flex items-center gap-3"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            루틴 종료하기
                        </Button>
                    </div>
                </div>
            </div>

            {/* Routine Info Footer */}
            <div className="p-6 bg-slate-900 border-t border-slate-800">
                <div className="max-w-2xl mx-auto">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Included Drills</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {routine.items?.map((item, idx) => (
                            <div key={idx} className="flex-shrink-0 w-48 bg-slate-800 rounded-lg p-3 border border-slate-700 flex items-center gap-3 opacity-70">
                                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                                    <div className="text-xs text-slate-500">{item.duration}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
