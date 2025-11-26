import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDrillById, checkDrillOwnership, incrementDrillViews, calculateDrillPrice, getRoutines } from '../lib/api';
import { Drill, DrillRoutine } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, ArrowLeft, ThumbsUp, MessageSquare, Share2, MoreHorizontal, CheckCircle } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';

export const DrillDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [relatedRoutines, setRelatedRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showQuestComplete, setShowQuestComplete] = useState(false);

    useEffect(() => {
        if (id) {
            fetchDrill();
            checkUser();
            fetchRelated();
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

    const fetchRelated = async () => {
        // Mock related content by fetching some routines
        const { data } = await getRoutines();
        if (data) setRelatedRoutines(data.slice(0, 5));
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
        // TODO: Save completion to database and award XP
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
            {/* Left: Immersive Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-zinc-900/30 relative p-6">
                {/* Ambient Background Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[800px] bg-blue-500/10 blur-[100px] rounded-full"></div>
                </div>

                {/* Video Player Container */}
                <div className={`relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/10 ${drill.aspectRatio === '9:16' ? 'h-full max-h-[800px] aspect-[9/16]' : 'w-full max-w-4xl aspect-video'}`}>
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
                                    <PlayCircle className="w-10 h-10 text-white fill-white/20" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                                    {owns ? '영상을 불러오는 중...' : '프리미엄 드릴 잠금'}
                                </h3>
                                <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                                    이 기술을 마스터하고 싶으신가요? <br />지금 바로 수련을 시작하세요.
                                </p>
                                {!owns && (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        ₩{finalPrice.toLocaleString()}에 잠금 해제
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Floating Actions (Right side of video) */}
                    <div className="absolute right-4 bottom-20 flex flex-col gap-4">
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

            {/* Right: Info & Context Panel */}
            <div className="w-[400px] bg-zinc-950 border-l border-zinc-800 flex flex-col z-10">
                {/* Header: Creator */}
                <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
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
                        <div>
                            <p className="font-bold text-white text-sm hover:underline cursor-pointer">{drill.creatorName}</p>
                            <p className="text-xs text-zinc-500">구독자 1.2만명</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full h-8">
                        구독하기
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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

                    {/* Related Drills */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3">다음 드릴</h3>
                        <div className="space-y-3">
                            {relatedRoutines.map((routine) => (
                                <Link to={`/drills`} key={routine.id} className="flex gap-3 group cursor-pointer p-2 rounded-xl hover:bg-zinc-900 transition-colors">
                                    <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                        <img
                                            src={routine.thumbnailUrl || 'https://via.placeholder.com/300'}
                                            alt={routine.title}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <h4 className="font-medium text-sm text-zinc-200 line-clamp-2 group-hover:text-blue-400 leading-snug mb-1">
                                            {routine.title}
                                        </h4>
                                        <p className="text-xs text-zinc-500 truncate">{routine.creatorName || 'Grappl Official'}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950">
                    {owns ? (
                        <Button
                            onClick={handleComplete}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-900/20"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            드릴 완료 체크
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePurchase}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20"
                        >
                            ₩{finalPrice.toLocaleString()} • 구매하기
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
                streak={3}
            />
        </div>
    );
};
