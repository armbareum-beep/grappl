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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!drill) return <div>Drill not found</div>;

    const finalPrice = calculateDrillPrice(drill.price, isSubscriber);

    return (
        <div className="min-h-screen bg-slate-50 pt-6">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Left, 2 cols) */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Video Player */}
                        <div className="bg-black rounded-xl overflow-hidden aspect-video shadow-lg relative">
                            {owns && drill.vimeoUrl ? (
                                <iframe
                                    src={drill.vimeoUrl}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="w-full h-full relative">
                                    <img
                                        src={drill.thumbnailUrl}
                                        alt={drill.title}
                                        className="w-full h-full object-cover opacity-50"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                                        <PlayCircle className="w-16 h-16 mb-4 opacity-80" />
                                        <h3 className="text-xl font-bold mb-2">
                                            {owns ? '영상을 불러오는 중...' : '이 드릴은 구매가 필요합니다'}
                                        </h3>
                                        {!owns && (
                                            <Button onClick={handlePurchase} size="lg" className="mt-4">
                                                ₩{finalPrice.toLocaleString()}에 구매하기
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Completion Button */}
                        {owns && (
                            <div className="bg-slate-100 rounded-xl p-4">
                                <Button
                                    onClick={handleComplete}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
                                    size="lg"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    드릴 완료하기
                                </Button>
                            </div>
                        )}

                        {/* Video Info */}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{drill.title}</h1>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${drill.creatorName}&background=random`}
                                            className="w-10 h-10 rounded-full"
                                            alt={drill.creatorName}
                                        />
                                        <div>
                                            <p className="font-semibold text-slate-900">{drill.creatorName}</p>
                                            <p className="text-xs">구독자 1.2만명</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                        <ThumbsUp className="w-4 h-4" />
                                        <span className="text-sm font-medium">124</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                        <Share2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">공유</span>
                                    </button>
                                    <button className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Description Box */}
                            <div className="mt-4 bg-slate-100 rounded-xl p-4 text-sm">
                                <div className="flex gap-4 font-bold text-slate-900 mb-2">
                                    <span>조회수 {drill.views.toLocaleString()}회</span>
                                    <span>{drill.duration}</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{drill.description || '설명이 없습니다.'}</p>
                                <div className="mt-4 flex gap-2">
                                    <span className="bg-slate-200 px-2 py-1 rounded text-xs text-slate-600">#{drill.category}</span>
                                    <span className="bg-slate-200 px-2 py-1 rounded text-xs text-slate-600">#{drill.difficulty}</span>
                                </div>
                            </div>

                            {/* Comments Section (Placeholder) */}
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    댓글 <span className="text-slate-500 text-base font-normal">3개</span>
                                </h3>
                                <div className="flex gap-4 mb-6">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="댓글 추가..."
                                        className="w-full border-b border-slate-200 focus:border-slate-900 outline-none py-2 bg-transparent transition-colors"
                                    />
                                </div>
                                {/* Mock Comments */}
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm">User {i}</span>
                                                    <span className="text-xs text-slate-500">2일 전</span>
                                                </div>
                                                <p className="text-sm text-slate-700">정말 좋은 드릴이네요! 많은 도움이 되었습니다.</p>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <button className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                                                        <ThumbsUp className="w-3 h-3" /> 12
                                                    </button>
                                                    <button className="text-xs text-slate-500 hover:text-slate-900">답글</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right, 1 col) */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 text-lg">다음 동영상</h3>
                        <div className="space-y-3">
                            {relatedRoutines.map((routine) => (
                                <Link to={`/drills`} key={routine.id} className="flex gap-2 group cursor-pointer">
                                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src={routine.thumbnailUrl || 'https://via.placeholder.com/300'}
                                            alt={routine.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                            {routine.totalDurationMinutes}:00
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 group-hover:text-blue-600 leading-tight mb-1">
                                            {routine.title}
                                        </h4>
                                        <p className="text-xs text-slate-500">{routine.creatorName || 'Grappl Official'}</p>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                            <span>조회수 1.2천회</span>
                                            <span>•</span>
                                            <span>3일 전</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
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
