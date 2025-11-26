import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRoutineById, checkDrillRoutineOwnership, incrementDrillRoutineViews, getDrillById } from '../lib/api';
import { Drill, DrillRoutine } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, ThumbsUp, MessageSquare, Share2, CheckCircle, ChevronRight, Lock } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';

export const RoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (id) {
            fetchRoutine();
            checkUser();
        }
    }, [id]);

    useEffect(() => {
        if (routine && routine.drills && routine.drills.length > 0) {
            loadDrill(currentDrillIndex);
        }
    }, [routine, currentDrillIndex]);

    const fetchRoutine = async () => {
        if (!id) return;
        try {
            const { data: routineData, error } = await getRoutineById(id);
            if (routineData) {
                setRoutine(routineData);
                await incrementDrillRoutineViews(id);
            } else if (error) {
                console.error('Error fetching routine:', error);
            }
        } catch (error) {
            console.error('Error fetching routine:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDrill = async (index: number) => {
        if (!routine || !routine.drills || index >= routine.drills.length) return;
        const drill = routine.drills[index];

        // If drill is just an ID, fetch full data
        if (typeof drill === 'string') {
            const drillData = await getDrillById(drill);
            setCurrentDrill(drillData);
        } else {
            setCurrentDrill(drill);
        }
    };

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            const { data: userData } = await supabase
                .from('users')
                .select('is_subscriber')
                .eq('id', user.id)
                .single();
            if (userData) setIsSubscriber(userData.is_subscriber);
            if (id) {
                const ownership = await checkDrillRoutineOwnership(user.id, id);
                setOwns(ownership);
            }
        }
    };

    const handlePurchase = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!routine) return;
        navigate(`/payment/routine/${routine.id}?price=${routine.price}`);
    };

    const handleDrillComplete = () => {
        if (!currentDrill) return;
        const newCompleted = new Set(completedDrills);
        newCompleted.add(currentDrill.id);
        setCompletedDrills(newCompleted);

        // Auto-advance to next drill
        if (currentDrillIndex < (routine?.drills?.length || 0) - 1) {
            setCurrentDrillIndex(currentDrillIndex + 1);
        } else {
            // All drills completed
            setShowQuestComplete(true);
        }
    };

    const handleDrillSelect = (index: number) => {
        setCurrentDrillIndex(index);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!routine) return <div className="text-white text-center pt-20">Routine not found</div>;
    if (!currentDrill) return <div className="text-white text-center pt-20">Loading drill...</div>;

    const progress = (completedDrills.size / (routine.drills?.length || 1)) * 100;

    return (
        <div className="h-[calc(100vh-64px)] bg-black flex overflow-hidden">
            {/* Left: Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-zinc-900/30 relative">
                {/* Ambient Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[700px] bg-blue-500/10 blur-[120px] rounded-full"></div>
                </div>

                {/* Video Player - Full Height 9:16 */}
                <div className="relative h-full w-auto aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {owns && currentDrill.vimeoUrl ? (
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
                                className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/20 backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                                    <Lock className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                                    루틴 구매 필요
                                </h3>
                                <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                                    이 루틴의 모든 드릴을 마스터하세요. <br />지금 바로 시작하세요.
                                </p>
                                {!owns && (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        ₩{routine.price.toLocaleString()}에 잠금 해제
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Floating Actions */}
                    <div className="absolute right-4 bottom-24 flex flex-col gap-4">
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <ThumbsUp className="w-6 h-6" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <MessageSquare className="w-6 h-6" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <Share2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    {owns && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Info Panel - Full Height */}
            <div className="w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                            <img
                                src={`https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`}
                                className="w-10 h-10 rounded-full ring-2 ring-zinc-800"
                                alt={routine.creatorName}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] text-white px-1.5 py-0.5 rounded-full border border-zinc-950 font-bold">
                                PRO
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm hover:underline cursor-pointer">{routine.creatorName}</p>
                            <p className="text-xs text-zinc-500">구독자 1.2만명</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full h-8">
                            구독하기
                        </Button>
                    </div>

                    {/* Routine Title */}
                    <h2 className="text-lg font-black text-white mb-2">{routine.title}</h2>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{routine.views?.toLocaleString() || 0}회</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" />
                            <span>{routine.drillCount || routine.drills?.length || 0}개 드릴</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{routine.totalDurationMinutes || 0}분</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content - Drill List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {/* Current Drill Info */}
                    <div className="p-6 border-b border-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-blue-400">현재 재생중</span>
                            <span className="text-xs text-zinc-500">드릴 {currentDrillIndex + 1}/{routine.drills?.length || 0}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{currentDrill.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            {currentDrill.description || '설명이 없습니다.'}
                        </p>
                    </div>

                    {/* Drill Playlist */}
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-white mb-3">루틴 드릴 목록</h4>
                        <div className="space-y-2">
                            {routine.drills?.map((drill, index) => {
                                const drillData = typeof drill === 'string' ? null : drill;
                                const isCompleted = drillData && completedDrills.has(drillData.id);
                                const isCurrent = index === currentDrillIndex;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => owns && handleDrillSelect(index)}
                                        disabled={!owns}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent
                                            ? 'bg-blue-600/20 border border-blue-500/50'
                                            : owns
                                                ? 'hover:bg-zinc-900 border border-transparent'
                                                : 'opacity-50 cursor-not-allowed border border-transparent'
                                            }`}
                                    >
                                        <div className="relative w-16 aspect-[9/16] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                            {drillData?.thumbnailUrl && (
                                                <img
                                                    src={drillData.thumbnailUrl}
                                                    alt={drillData.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {!owns && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Lock className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-zinc-500">#{index + 1}</span>
                                                {isCompleted && <CheckCircle className="w-3 h-3 text-green-400" />}
                                            </div>
                                            <h5 className={`text-sm font-medium line-clamp-2 leading-snug ${isCurrent ? 'text-blue-400' : 'text-zinc-200'
                                                }`}>
                                                {drillData?.title || `드릴 ${index + 1}`}
                                            </h5>
                                            <p className="text-xs text-zinc-500">{drillData?.duration || '0:00'}</p>
                                        </div>
                                        {isCurrent && (
                                            <div className="flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0">
                    {owns ? (
                        <Button
                            onClick={handleDrillComplete}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-900/20"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            드릴 완료 & 다음으로
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePurchase}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20"
                        >
                            ₩{routine.price.toLocaleString()} • 루틴 구매하기
                        </Button>
                    )}
                </div>
            </div>

            {/* Quest Complete Modal */}
            <QuestCompleteModal
                isOpen={showQuestComplete}
                onClose={() => setShowQuestComplete(false)}
                questName={routine?.title || '루틴'}
                xpEarned={50}
                streak={completedDrills.size}
            />
        </div>
    );
};
