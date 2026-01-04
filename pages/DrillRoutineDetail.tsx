import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDrillRoutineById, checkDrillRoutineOwnership, incrementDrillRoutineViews, calculateRoutinePrice } from '../lib/api';
import { DrillRoutine } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, List, Eye, ArrowLeft, Clock } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const DrillRoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchRoutine();
            checkUser();
        }
    }, [id]);

    const fetchRoutine = async () => {
        if (!id) return;
        setError(null);
        setLoading(true);

        try {
            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            const routinePromise = getDrillRoutineById(id);

            const routineData = await Promise.race([routinePromise, timeoutPromise]) as DrillRoutine;

            if (routineData) {
                setRoutine(routineData);
                // Increment views
                incrementDrillRoutineViews(id);
                // Record View History
                if (user) {
                    import('../lib/api').then(({ recordRoutineView }) => {
                        recordRoutineView(user.id, id).catch(console.error);
                    });
                }
            }
        } catch (error: any) {
            console.error('Error fetching routine:', error);
            setError(error.message || 'Failed to load routine');
        } finally {
            setLoading(false);
        }
    };

    const checkUser = async () => {
        // First check if this is the daily routine (accessible to everyone)
        if (id) {
            import('../lib/api').then(async ({ getDailyRoutine }) => {
                const { data: dailyRoutine } = await getDailyRoutine();
                if (dailyRoutine && dailyRoutine.id === id) {
                    setOwns(true);
                }
            });
        }

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
                const ownership = await checkDrillRoutineOwnership(user.id, id);
                if (ownership) setOwns(true);
            }
        }
    };

    const handlePurchase = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!routine) return;

        const finalPrice = calculateRoutinePrice(routine.price, isSubscriber);

        // Navigate to payment page (you'll need to implement this)
        navigate(`/payment/drill-routine/${routine.id}?price=${finalPrice}`);
    };

    if (loading) {
        return <LoadingScreen message="루틴 정보를 불러오고 있습니다..." />;
    }


    if (error) {
        return <ErrorScreen error={error} resetMessage="루틴 정보를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }


    if (!routine) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">루틴을 찾을 수 없습니다</h2>
                    <Link to="/drills">
                        <Button>드릴 목록으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const finalPrice = calculateRoutinePrice(routine.price, isSubscriber);
    const discount = isSubscriber ? Math.round(((routine.price - finalPrice) / routine.price) * 100) : 0;
    const totalDuration = routine.drills?.reduce((acc, drill) => {
        const duration = drill.duration || '0:00';
        const [min, sec] = duration.split(':').map(Number);
        return acc + (isNaN(min) ? 0 : min) * 60 + (isNaN(sec) ? 0 : sec);
    }, 0) || 0;
    const totalMinutes = Math.floor(totalDuration / 60);
    const totalSeconds = totalDuration % 60;

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
                {/* Header */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 mb-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Thumbnail */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                            <img
                                src={routine.thumbnailUrl}
                                alt={routine.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center gap-3 text-white text-sm">
                                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-3 py-1.5">
                                        <List className="w-4 h-4" />
                                        <span className="font-semibold">{routine.drillCount}개 드릴</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-3 py-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span>{totalMinutes}:{totalSeconds.toString().padStart(2, '0')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-3 py-1.5">
                                        <Eye className="w-4 h-4" />
                                        <span>{routine.views.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-4">{routine.title}</h1>

                            {/* Creator */}
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-slate-600">크리에이터:</span>
                                <span className="font-semibold text-slate-900">{routine.creatorName}</span>
                            </div>

                            {/* Description */}
                            {routine.description && (
                                <div className="mb-6">
                                    <p className="text-slate-600 whitespace-pre-wrap">{routine.description}</p>
                                </div>
                            )}

                            {/* Price & Purchase */}
                            <div className="border-t border-slate-200 pt-6">
                                {owns ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                        <p className="text-green-700 font-semibold">이미 구매한 루틴입니다</p>
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
                                                            ₩{routine.price.toLocaleString()}
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
                                            루틴 구매하기
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

                {/* Drills List */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">포함된 드릴</h2>

                    {routine.drills && routine.drills.length > 0 ? (
                        <div className="space-y-4">
                            {routine.drills.map((drill, index) => (
                                <div
                                    key={drill.id}
                                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all"
                                >
                                    {/* Order Number */}
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>

                                    {/* Thumbnail */}
                                    <div className="flex-shrink-0 w-20 h-28 rounded overflow-hidden bg-slate-900">
                                        <img
                                            src={drill.thumbnailUrl}
                                            alt={drill.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 mb-1 truncate">{drill.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {drill.duration}
                                            </span>
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                                {drill.category}
                                            </span>
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                                                {drill.difficulty === 'Beginner' ? '초급' : drill.difficulty === 'Intermediate' ? '중급' : '상급'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Play Icon */}
                                    <div className="flex-shrink-0">
                                        <PlayCircle className="w-8 h-8 text-slate-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">드릴 정보를 불러오는 중...</p>
                    )}
                </div>
            </div>
        </div>
    );
};
