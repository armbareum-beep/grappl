import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDrillById, checkDrillOwnership, incrementDrillViews, calculateDrillPrice } from '../lib/api';
import { Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Heart, Bookmark, Share2, MoreVertical, Play, Lock, CheckCircle } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';
import { AddToRoutineModal } from '../components/AddToRoutineModal';

export const DrillDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(true);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [showAddToRoutine, setShowAddToRoutine] = useState(false);

    // Video player state
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [currentVideoType, setCurrentVideoType] = useState<'action' | 'description'>('action');
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

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

                // Check ownership after drill is loaded
                const { data: { user } } = await supabase.auth.getUser();
                if (user && drillData.creatorId === user.id) {
                    setOwns(true);
                }

                // Check if saved
                const savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                setSaved(savedDrills.some((d: Drill) => d.id === id));
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

                // Also check if user is the creator
                if (drill && drill.creatorId === user.id) {
                    setOwns(true);
                }
            }
        }
    };

    // Auto-play current video
    useEffect(() => {
        if (videoRef.current && isPlaying && owns) {
            videoRef.current.play().catch(err => console.log('Play error:', err));
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [isPlaying, currentVideoType, owns]);

    // Update progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress);
        };

        video.addEventListener('timeupdate', updateProgress);
        return () => video.removeEventListener('timeupdate', updateProgress);
    }, [currentVideoType]);

    // Handle video end - loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [currentVideoType]);

    const togglePlayPause = () => {
        if (owns) {
            setIsPlaying(!isPlaying);
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

    const handleLike = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setLiked(!liked);
    };

    const handleSave = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        let savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');

        if (saved) {
            savedDrills = savedDrills.filter((d: Drill) => d.id !== drill?.id);
            alert('저장된 드릴에서 제거되었습니다.');
        } else {
            if (drill && !savedDrills.find((d: Drill) => d.id === drill.id)) {
                savedDrills.push(drill);
            }
            alert('드릴이 저장되었습니다!');
        }

        localStorage.setItem('saved_drills', JSON.stringify(savedDrills));
        setSaved(!saved);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: drill?.title,
                    text: `Check out this drill: ${drill?.title}`,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Share error:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('링크가 복사되었습니다!');
        }
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

    // Determine video source - both action and description can be Vimeo
    const isActionVideo = currentVideoType === 'action';
    const vimeoId = isActionVideo ? drill.vimeoUrl : drill.descriptionVideoUrl;
    const fallbackUrl = isActionVideo ? drill.videoUrl : (drill.descriptionVideoUrl || drill.videoUrl);

    const useVimeo = vimeoId && owns;
    const videoSrc = useVimeo ? `https://player.vimeo.com/video/${vimeoId}` : fallbackUrl;

    return (
        <div className="relative h-screen w-screen bg-black overflow-hidden select-none">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="w-full p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        {/* Video Type Tabs */}
                        <div className="flex items-center gap-3 pointer-events-auto">
                            <button
                                onClick={() => setCurrentVideoType('action')}
                                className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'action' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
                            >
                                동작
                            </button>
                            <button
                                onClick={() => setCurrentVideoType('description')}
                                className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'description' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
                            >
                                설명
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Container - 9:16 aspect ratio */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="relative w-full h-full max-w-[56.25vh]">
                    {owns ? (
                        useVimeo ? (
                            <iframe
                                key={`vimeo-${vimeoId}-${currentVideoType}`}
                                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&autopause=0&background=1&controls=0`}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <>
                                <video
                                    key={`${drill.id}-${currentVideoType}`}
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loop
                                    playsInline
                                    muted={false}
                                    autoPlay={isPlaying}
                                    onClick={togglePlayPause}
                                    src={videoSrc}
                                />

                                {/* Play/Pause Overlay */}
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play className="w-10 h-10 text-black ml-1" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )
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
                                {drill.price > 0 ? (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        ₩{finalPrice.toLocaleString()}에 구매하기
                                    </Button>
                                ) : (
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
                </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    {/* Left: Info */}
                    <div className="flex-1 pr-4">
                        <h2 className="text-white font-bold text-xl mb-2 line-clamp-2">
                            {drill.title}
                            {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                        </h2>
                        <p className="text-white/80 text-sm mb-3">
                            @{drill.creatorName || 'Unknown'}
                        </p>

                        {/* Tags */}
                        {drill.tags && drill.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {drill.tags.slice(0, 3).map((tag: string, idx: number) => (
                                    <span key={idx} className="text-white/90 text-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Drill Info */}
                        <div className="flex items-center gap-4 text-white/70 text-xs">
                            <span>{drill.length || drill.duration || '0:30'}</span>
                            <span>•</span>
                            <span>{drill.views || 0} views</span>
                            <span>•</span>
                            <span>{drill.difficulty}</span>
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-6">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Heart
                                    className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                                />
                            </div>
                            <span className="text-white text-xs">
                                {(drill.likes || 0) + (liked ? 1 : 0)}
                            </span>
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Bookmark
                                    className={`w-6 h-6 ${saved ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`}
                                />
                            </div>
                            <span className="text-white text-xs">저장</span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Share2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white text-xs">공유</span>
                        </button>

                        {/* Add to Routine / Complete */}
                        {owns && (
                            <button
                                onClick={() => setShowAddToRoutine(true)}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <MoreVertical className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-white text-xs">루틴</span>
                            </button>
                        )}
                    </div>
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

            {/* Add to Routine Modal */}
            {drill && (
                <AddToRoutineModal
                    drill={drill}
                    isOpen={showAddToRoutine}
                    onClose={() => setShowAddToRoutine(false)}
                    onSuccess={() => {
                        // Optionally reload or update UI
                    }}
                />
            )}
        </div>
    );
};
