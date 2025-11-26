import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDrillById, checkDrillOwnership, incrementDrillViews, calculateDrillPrice } from '../lib/api';
import { Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, ThumbsUp, MessageSquare, Share2, CheckCircle, Lock, ArrowLeft } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';

export const DrillDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showQuestComplete, setShowQuestComplete] = useState(false);

    useEffect(() => {
        if (id) {
            fetchDrill();
            checkUser();
        }
    }, [id]);

    const fetchDrill = async () => {
        if (!id) return;
        try {
            const drillData = await getDrillById(id);
            if (drillData) {
                setDrill(drillData);
                await incrementDrillViews(id);
            }
        } catch (error) {
            console.error('Error fetching drill:', error);
        } finally {
            setLoading(false);
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
                const ownership = await checkDrillOwnership(user.id, id);
                setOwns(ownership);
            }
        }
    };

    const handlePurchase = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!drill) return;
        const finalPrice = calculateDrillPrice(drill.price, isSubscriber);
        navigate(`/payment/drill/${drill.id}?price=${finalPrice}`);
    };

    const handleComplete = () => {
        setShowQuestComplete(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!drill) return <div className="text-white text-center pt-20">Drill not found</div>;

    const finalPrice = calculateDrillPrice(drill.price, isSubscriber);

    return (
        <div className="h-[calc(100vh-64px)] bg-black flex overflow-hidden">
            {/* Left: Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-zinc-900/30 relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Ambient Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[700px] bg-blue-500/10 blur-[120px] rounded-full"></div>
                </div>

                {/* Video Player - Full Height 9:16 */}
                <div className="relative h-full w-auto aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {owns && drill.vimeoUrl ? (
                        <iframe
                            src={drill.vimeoUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="w-full h-full relative group">
                            <img
                                src={drill.thumbnailUrl}
                                alt={drill.title}
                                className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/20 backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                                    <Lock className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                                    {drill.price === 0 ? '구독 필요' : '드릴 구매 필요'}
                                </h3>
                                <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                                    이 기술을 마스터하고 싶으신가요? <br />지금 바로 시작하세요.
                                </p>
                                {!owns && drill.price > 0 && (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        ₩{finalPrice.toLocaleString()}에 구매하기
                                    </Button>
                                )}
                                {!owns && drill.price === 0 && (
                                    <Button
                                        onClick={() => navigate('/pricing')}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        구독하기
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
                </div>
            </div>

            {/* Right: Info Panel */}
            <div className="w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                            <img
                                src={`https://ui-avatars.com/api/?name=${drill.creatorName}&background=random`}
                                className="w-10 h-10 rounded-full ring-2 ring-zinc-800"
                                alt={drill.creatorName}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] text-white px-1.5 py-0.5 rounded-full border border-zinc-950 font-bold">
                                PRO
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm hover:underline cursor-pointer">{drill.creatorName}</p>
                            <p className="text-xs text-zinc-500">구독자 1.2만명</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full h-8">
                            구독하기
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {/* Drill Info */}
                    <div>
                        <h1 className="text-2xl font-black text-white mb-3 leading-tight">{drill.title}</h1>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                            <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>{drill.views.toLocaleString()}회</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{drill.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>{drill.difficulty}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-400 text-xs border border-zinc-800">#{drill.category}</span>
                            {drill.tags?.map(tag => (
                                <span key={tag} className="px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-400 text-xs border border-zinc-800">#{tag}</span>
                            ))}
                        </div>

                        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {drill.description || '설명이 없습니다.'}
                        </p>
                    </div>

                    {/* Add to Routine */}
                    {(owns || drill.price === 0) && (
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                            <h3 className="text-sm font-bold text-white mb-2">내 루틴에 추가</h3>
                            <p className="text-xs text-zinc-400 mb-3">이 드릴을 나만의 루틴에 추가하세요</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const saved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                                    if (!saved.find((d: any) => d.id === drill.id)) {
                                        saved.push(drill);
                                        localStorage.setItem('saved_drills', JSON.stringify(saved));
                                        alert('나만의 루틴 목록에 추가되었습니다! 아레나 탭에서 확인하세요.');
                                    } else {
                                        alert('이미 추가된 드릴입니다.');
                                    }
                                }}
                                className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                                + 루틴에 추가
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0">
                    {owns ? (
                        <Button
                            onClick={handleComplete}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-900/20"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            드릴 완료 체크
                        </Button>
                    ) : drill.price > 0 ? (
                        <Button
                            onClick={handlePurchase}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20"
                        >
                            ₩{finalPrice.toLocaleString()} • 구매하기
                        </Button>
                    ) : (
                        <Button
                            onClick={() => navigate('/pricing')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20"
                        >
                            구독하여 시청하기
                        </Button>
                    )}
                </div>
            </div>

            {/* Quest Complete Modal */}
            <QuestCompleteModal
                isOpen={showQuestComplete}
                onClose={() => setShowQuestComplete(false)}
                questName={drill?.title || '드릴'}
                xpEarned={10}
                streak={1}
            />
        </div>
    );
};
