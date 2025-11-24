import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDrillById, checkDrillOwnership, incrementDrillViews, calculateDrillPrice } from '../lib/api';
import { Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, ArrowLeft } from 'lucide-react';

export const DrillDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);

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
                // Increment views
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

            // Check subscription status
            const { data: userData } = await supabase
                .from('users')
                .select('is_subscriber')
                .eq('id', user.id)
                .single();

            if (userData) {
                setIsSubscriber(userData.is_subscriber);
            }

            // Check ownership
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

        // Navigate to payment page (you'll need to implement this)
        navigate(`/payment/drill/${drill.id}?price=${finalPrice}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!drill) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">드릴을 찾을 수 없습니다</h2>
                    <Link to="/drills">
                        <Button>드릴 목록으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const finalPrice = calculateDrillPrice(drill.price, isSubscriber);
    const discount = isSubscriber ? Math.round(((drill.price - finalPrice) / drill.price) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Back Button */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <button
                    onClick={() => navigate('/drills')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>드릴 목록으로</span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Video Player - Vertical */}
                    <div className="flex justify-center">
                        <div className="w-full max-w-md">
                            <div
                                className="relative bg-slate-900 rounded-xl overflow-hidden shadow-2xl"
                                style={{ aspectRatio: '9/16' }}
                            >
                                {owns && drill.vimeoUrl ? (
                                    <iframe
                                        src={drill.vimeoUrl}
                                        className="absolute inset-0 w-full h-full"
                                        frameBorder="0"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <>
                                        <img
                                            src={drill.thumbnailUrl}
                                            alt={drill.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="text-center text-white">
                                                <PlayCircle className="w-20 h-20 mx-auto mb-4 opacity-80" />
                                                <p className="text-lg font-semibold">
                                                    {owns ? '영상을 불러오는 중...' : '드릴을 구매하여 시청하세요'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                        {/* Category & Difficulty */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                {drill.category}
                            </span>
                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                                {drill.difficulty === 'Beginner' ? '초급' : drill.difficulty === 'Intermediate' ? '중급' : '상급'}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">{drill.title}</h1>

                        {/* Creator */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-slate-600">크리에이터:</span>
                            <span className="font-semibold text-slate-900">{drill.creatorName}</span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 mb-6 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{drill.duration}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span>{drill.views.toLocaleString()} views</span>
                            </div>
                        </div>

                        {/* Description */}
                        {drill.description && (
                            <div className="mb-6">
                                <h3 className="font-semibold text-slate-900 mb-2">설명</h3>
                                <p className="text-slate-600 whitespace-pre-wrap">{drill.description}</p>
                            </div>
                        )}

                        {/* Price & Purchase */}
                        <div className="border-t border-slate-200 pt-6">
                            {owns ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <p className="text-green-700 font-semibold">이미 구매한 드릴입니다</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-3xl font-bold text-blue-600">
                                                ₩{finalPrice.toLocaleString()}
                                            </span>
                                            {discount > 0 && (
                                                <>
                                                    <span className="text-lg text-slate-400 line-through">
                                                        ₩{drill.price.toLocaleString()}
                                                    </span>
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-semibold">
                                                        {discount}% 할인
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {isSubscriber && (
                                            <p className="text-sm text-blue-600">
                                                ✨ 구독자 할인이 적용되었습니다!
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={handlePurchase}
                                    >
                                        드릴 구매하기
                                    </Button>

                                    {!user && (
                                        <p className="text-sm text-slate-500 text-center mt-3">
                                            로그인하여 구매하세요
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
