import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDrillById, createTrainingLog, addXP, updateQuestProgress, createFeedPost } from '../lib/api';
import { Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, ThumbsUp, MessageSquare, Share2, CheckCircle, ArrowLeft, Edit, Trash2, Play, Square } from 'lucide-react';

interface UserRoutine {
    id: string;
    name: string;
    drillIds: string[];
    createdAt: string;
}

export const MyRoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<UserRoutine | null>(null);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Routine State
    const [isRoutineStarted, setIsRoutineStarted] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        checkUser();
        if (id) {
            fetchRoutine();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    useEffect(() => {
        if (drills.length > 0) {
            setCurrentDrill(drills[currentDrillIndex]);
        }
    }, [drills, currentDrillIndex]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
        } else {
            navigate('/login');
        }
    };

    const fetchRoutine = async () => {
        if (!id) return;
        try {
            // Mock data
            const mockRoutine: UserRoutine = {
                id: id,
                name: '내 루틴 #1',
                drillIds: ['mock-1', 'mock-2', 'mock-3'],
                createdAt: new Date().toISOString()
            };

            setRoutine(mockRoutine);

            const drillPromises = mockRoutine.drillIds.map(drillId => getDrillById(drillId));
            const drillResults = await Promise.all(drillPromises);
            const validDrills = drillResults.filter(d => d !== null) as Drill[];
            setDrills(validDrills);
        } catch (error) {
            console.error('Error fetching routine:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNextDrill = () => {
        if (currentDrillIndex < drills.length - 1) {
            setCurrentDrillIndex(currentDrillIndex + 1);
        }
    };

    const handleStartRoutine = () => {
        setIsRoutineStarted(true);
        setStartTime(Date.now());

        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
    };

    const handleFinishRoutine = async () => {
        if (!user || !routine || isSubmitting) return;

        if (timerRef.current) clearInterval(timerRef.current);
        setIsSubmitting(true);

        try {
            const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

            // 1. Create Log
            const { data: log, error } = await createTrainingLog({
                userId: user.id,
                userName: user.user_metadata?.name || 'Unknown User',
                date: new Date().toISOString().split('T')[0],
                durationMinutes: durationMinutes,
                sparringRounds: 0,
                notes: `[루틴 완료] ${routine.name}\n\n완료한 드릴:\n${drills.map((d, i) => `${i + 1}. ${d.title}`).join('\n')}`,
                techniques: drills.map(d => d.title),
                isPublic: true,
                location: 'Home / Gym'
            }, true); // Skip daily check for routine logs

            if (error) throw error;

            // 2. Update Quest (Awards XP if completed, handles daily limit)
            const { completed, xpEarned } = await updateQuestProgress(user.id, 'complete_routine');

            // Also mark 'write_log' quest as completed since we created a log
            await updateQuestProgress(user.id, 'write_log');

            // 3. Share
            const shareToFeed = window.confirm(`🎉 루틴 완료! ${xpEarned > 0 ? `(+${xpEarned} XP)` : ''}\n\n⏱️ 소요 시간: ${formatTime(elapsedSeconds)}\n\n피드에 공유하시겠습니까?`);

            if (shareToFeed) {
                const feedContent = `💪 훈련 루틴 완료!\n\n${routine.name}\n⏱️ 소요 시간: ${durationMinutes}분\n${xpEarned > 0 ? `✨ 획득 XP: +${xpEarned}\n` : ''}\n완료한 드릴: ${drills.slice(0, 3).map(d => d.title).join(', ')}${drills.length > 3 ? ` 외 ${drills.length - 3}개` : ''}`;

                await createFeedPost({
                    userId: user.id,
                    content: feedContent,
                    type: 'routine',
                    metadata: {
                        routineTitle: routine.name,
                        durationMinutes: durationMinutes,
                        xpEarned: xpEarned,
                        drillCount: drills.length
                    }
                });
                alert('피드에 공유되었습니다!');
            }

            navigate('/arena');

        } catch (error: any) {
            console.error('Error completing routine:', error);
            alert(`오류가 발생했습니다: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDrillSelect = (index: number) => {
        setCurrentDrillIndex(index);
    };

    const handleDeleteRoutine = async () => {
        if (!confirm('이 루틴을 삭제하시겠습니까?')) return;
        navigate('/arena');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
    if (!routine || !currentDrill) return <div className="text-white text-center pt-20">루틴을 찾을 수 없습니다</div>;

    const isLastDrill = currentDrillIndex === drills.length - 1;

    return (
        <div className="h-[calc(100vh-64px)] bg-black flex overflow-hidden">
            {/* Left: Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-zinc-900/30 relative">
                <button
                    onClick={() => navigate('/arena')}
                    className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Timer Overlay when Routine Started */}
                {isRoutineStarted && (
                    <div className="absolute top-6 right-6 z-10 bg-red-600/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-lg animate-pulse">
                        <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                        <span className="text-2xl font-black text-white font-mono">{formatTime(elapsedSeconds)}</span>
                    </div>
                )}

                <div className="relative h-full w-auto aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {currentDrill.vimeoUrl ? (
                        <iframe
                            src={currentDrill.vimeoUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="w-full h-full relative group">
                            <img
                                src={currentDrill.thumbnailUrl}
                                alt={currentDrill.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Info Panel */}
            <div className="w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
                <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-white">{routine.name}</h2>
                        <div className="flex gap-2">
                            <button className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={handleDeleteRoutine} className="p-2 rounded-lg bg-zinc-900 hover:bg-red-900 text-zinc-400 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /><span>{drills.length}개 드릴</span></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    <div className="p-6 border-b border-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-purple-400">현재 재생중</span>
                            <span className="text-xs text-zinc-500">드릴 {currentDrillIndex + 1}/{drills.length}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{currentDrill.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">{currentDrill.description || '설명이 없습니다.'}</p>
                    </div>

                    <div className="p-6">
                        <h4 className="text-sm font-bold text-white mb-3">내 루틴 드릴 목록</h4>
                        <div className="space-y-2">
                            {drills.map((drill, index) => {
                                const isCurrent = index === currentDrillIndex;
                                return (
                                    <button
                                        key={drill.id}
                                        onClick={() => handleDrillSelect(index)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? 'bg-purple-600/20 border border-purple-500/50' : 'hover:bg-zinc-900 border border-transparent'}`}
                                    >
                                        <div className="relative w-16 aspect-[9/16] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-zinc-500">#{index + 1}</span>
                                            </div>
                                            <h5 className={`text-sm font-medium line-clamp-2 leading-snug ${isCurrent ? 'text-purple-400' : 'text-zinc-200'}`}>{drill.title}</h5>
                                            <p className="text-xs text-zinc-500">{drill.duration}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Action Button */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0">
                    {!isRoutineStarted ? (
                        isLastDrill ? (
                            <Button
                                onClick={handleStartRoutine}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-green-900/20"
                            >
                                <Play className="w-5 h-5 mr-2 fill-current" />
                                루틴 시작하기 (타이머 시작)
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNextDrill}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-6 rounded-xl"
                            >
                                다음 드릴 보기
                            </Button>
                        )
                    ) : (
                        <Button
                            onClick={handleFinishRoutine}
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-red-900/20 animate-pulse"
                        >
                            <Square className="w-5 h-5 mr-2 fill-current" />
                            루틴 종료 & 기록하기
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
