import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Check } from 'lucide-react';
import { Drill, SparringVideo, Lesson } from '../../types';
import { DrillReelItem } from '../drills/DrillReelItem';
import { SparringReelItem } from './SparringReelItem';
import { LessonReelItem } from './LessonReelItem';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Access control info for each item
interface AccessInfo {
    canAccess: boolean;
    requiresLogin?: boolean;
    requiresSubscription?: boolean;
    requiresPurchase?: boolean;
    price?: number;
}

// Define the mixed item type
export type MixedItem =
    | { type: 'drill'; data: Drill; accessInfo?: AccessInfo }
    | { type: 'sparring'; data: SparringVideo; accessInfo?: AccessInfo }
    | { type: 'lesson'; data: Lesson; accessInfo?: AccessInfo };

// Re-use DrillReelsFeed logic structure
interface MixedReelsFeedProps {
    items: MixedItem[];
    initialIndex?: number;
    onChangeView?: () => void;
    userPermissions?: {
        isSubscriber: boolean;
        purchasedItemIds: string[];
    };
    isLoggedIn?: boolean;
}

export const MixedReelsFeed: React.FC<MixedReelsFeedProps> = ({
    items,
    initialIndex = 0,
    onChangeView,
    userPermissions = { isSubscriber: false, purchasedItemIds: [] },
    isLoggedIn = false
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Drill specific interactions state (Only for drills logic, sparring has own internal logic in item, less unified but works)
    const [likedDrills, setLikedDrills] = useState<Set<string>>(new Set());
    const [savedDrills, setSavedDrills] = useState<Set<string>>(new Set());
    const [followingCreators, setFollowingCreators] = useState<Set<string>>(new Set());

    // Mute state shared? Maybe per item is better but feed usually has global mute toggle logic visually
    const [isMuted, setIsMuted] = useState(true);

    // Login modal state for non-logged-in users
    const [showLoginModal, setShowLoginModal] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const [countdownProgress, setCountdownProgress] = useState(0);

    // Show login modal after 10 seconds if not logged in (repeats if closed)
    useEffect(() => {
        if (!isLoggedIn && !showLoginModal) {
            setCountdownProgress(0);
            const startTime = Date.now();
            const duration = 10000; // 10 seconds

            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / duration) * 100, 100);
                setCountdownProgress(progress);

                if (elapsed >= duration) {
                    setShowLoginModal(true);
                    clearInterval(interval);
                }
            }, 50);

            return () => clearInterval(interval);
        }
    }, [isLoggedIn, showLoginModal]);

    // Fetch user interactions for drills (Sparring fetches its own inside item, we should maybe optimize later)
    useEffect(() => {
        const fetchUserInteractions = async () => {
            if (!user) return;
            try {
                // Fetch interactions relevant for cached display
                const [liked, saved, followed] = await Promise.all([
                    getUserLikedDrills(user.id),
                    getUserSavedDrills(user.id),
                    getUserFollowedCreators(user.id)
                ]);
                setLikedDrills(new Set(liked.map(d => d.id)));
                setSavedDrills(new Set(saved.map(d => d.id)));
                setFollowingCreators(new Set(followed));
            } catch (error) {
                console.error('Error fetching interactions:', error);
            }
        };
        fetchUserInteractions();
    }, [user]);

    // Navigation logic (Same as DrillReelsFeed)
    const goToNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, items.length]);

    // Mouse wheel navigation
    useEffect(() => {
        let wheelTimeout: NodeJS.Timeout;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                if (e.deltaY > 0) goToNext();
                else if (e.deltaY < 0) goToPrevious();
            }, 100);
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleWheel);
            clearTimeout(wheelTimeout);
        };
    }, [currentIndex]);

    // Touch handling
    const [touchStart, setTouchStart] = useState<{ y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEndY = e.changedTouches[0].clientY;
        const yDistance = touchStart.y - touchEndY;

        if (Math.abs(yDistance) > 50) {
            if (yDistance > 0) goToNext();
            else goToPrevious();
        }
        setTouchStart(null);
    };

    // Drill Handlers (since DrillReelItem props require them passed down)
    const handleDrillLike = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }
        const newSet = new Set(likedDrills);
        if (newSet.has(drill.id)) newSet.delete(drill.id);
        else newSet.add(drill.id);
        setLikedDrills(newSet);
        await toggleDrillLike(user.id, drill.id);
    };

    const handleDrillSave = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }
        const newSet = new Set(savedDrills);
        if (newSet.has(drill.id)) newSet.delete(drill.id);
        else newSet.add(drill.id);
        setSavedDrills(newSet);
        await toggleDrillSave(user.id, drill.id);
    };

    const handleDrillFollow = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }
        const newSet = new Set(followingCreators);
        if (newSet.has(drill.creatorId)) newSet.delete(drill.creatorId);
        else newSet.add(drill.creatorId);
        setFollowingCreators(newSet);
        await toggleCreatorFollow(user.id, drill.creatorId);
    };

    const handleShare = async (item: any) => {
        // Simple alert or open modal. DrillReelsFeed opens modal.
        // We can implement full modal logic if needed, but for now simple placeholder from prop
        // Actually DrillReelItem handles share modal internal or via callback.
        // We'll pass a dummy callback or impl minimum.
        console.log('Share', item);
    };

    const handleViewRoutine = async (drill: Drill) => {
        try {
            const { getRoutineByDrillId } = await import('../../lib/api');
            const { data: routine } = await getRoutineByDrillId(drill.id);
            if (routine) {
                navigate(`/routines/${routine.id}`);
            }
        } catch (error) {
            console.error('Error fetching routine for drill:', error);
        }
    };


    return (
        <>
            {/* Login Modal for Non-Logged-In Users */}
            <AnimatePresence>
                {showLoginModal && !isLoggedIn && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLoginModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-[#0e0e11] border border-zinc-800/50 rounded-[3rem] max-w-[340px] w-full overflow-hidden shadow-2xl"
                        >
                            <div className="p-7 relative z-10 flex flex-col items-center">
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="absolute top-5 right-5 p-1.5 bg-[#2a2a2e] hover:bg-[#3a3a3e] rounded-full text-zinc-400 transition-all active:scale-90"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Icon Header (Matched to Image 1) */}
                                <div className="w-16 h-16 bg-[#1a1a1e] rounded-2xl flex items-center justify-center mb-5 mt-4 border border-zinc-800">
                                    <Zap className="w-8 h-8 text-indigo-400 fill-indigo-400/10" />
                                </div>

                                {/* Title Group */}
                                <div className="text-center mb-5">
                                    <h3 className="text-[22px] font-bold text-white mb-3">시청 시작하기</h3>
                                    <p className="text-zinc-200 text-base font-bold leading-tight mb-2">
                                        로그인하고 모든 영상을<br />무제한으로 시청하세요
                                    </p>
                                    <p className="text-zinc-500 text-[13px] leading-snug max-w-[200px] mx-auto">
                                        로그인하시면 오늘의 무료 영상(레슨, 드릴, 스파링)을 바로 시청 가능합니다.
                                    </p>
                                </div>

                                {/* Benefits Box (Compact Style from Image 1) */}
                                <div className="w-full bg-[#1a1a1e] rounded-2xl p-5 mb-7 border border-zinc-800/50">
                                    <p className="text-zinc-200 text-xs font-bold mb-4">포함된 혜택:</p>
                                    <ul className="space-y-3">
                                        {[
                                            '오늘의 무료 영상 무제한 시청',
                                            '나만의 기술 저장 및 다시보기',
                                            '주간 시청 데이터 분석 리포트'
                                        ].map((text, i) => (
                                            <li key={i} className="flex items-center gap-3">
                                                <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                                                <span className="text-[13px] font-medium text-zinc-400">
                                                    {text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Actions (Side-by-side) */}
                                <div className="w-full space-y-3.5">
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => setShowLoginModal(false)}
                                            className="flex-1 py-3.5 bg-transparent hover:bg-zinc-800 text-zinc-400 font-bold text-[13px] rounded-xl border border-zinc-800 transition-all active:scale-95"
                                        >
                                            나중에 하기
                                        </button>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="flex-[1.4] py-3.5 bg-[#6d28d9] hover:bg-[#7c3aed] text-white font-bold text-[13px] rounded-2xl shadow-lg shadow-violet-900/40 transition-all active:scale-95"
                                        >
                                            로그인하고 시청
                                        </button>
                                    </div>
                                    <p className="text-center text-[10px] font-bold text-zinc-600 tracking-tight">
                                        카카오/구글로 3초면 끝나는 간편 로그인
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div
                ref={containerRef}
                className="fixed inset-0 z-50 w-full bg-black overflow-hidden overscroll-y-none touch-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Sliding Window Rendering */}
                {[-2, -1, 0, 1, 2].map(offset => {
                    const index = currentIndex + offset;
                    if (index < 0 || index >= items.length) return null;

                    const item = items[index];
                    const isActive = offset === 0;

                    if (item.type === 'drill') {
                        return (
                            <DrillReelItem
                                key={`drill-${item.data.id}`}
                                drill={item.data}
                                isActive={isActive}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(!isMuted)}
                                isLiked={likedDrills.has(item.data.id)}
                                onLike={() => handleDrillLike(item.data)}
                                likeCount={(item.data.likes || 0) + (likedDrills.has(item.data.id) ? 1 : 0)}
                                isSaved={savedDrills.has(item.data.id)}
                                onSave={() => handleDrillSave(item.data)}
                                isFollowed={followingCreators.has(item.data.creatorId)}
                                onFollow={() => handleDrillFollow(item.data)}
                                onShare={() => handleShare(item.data)}
                                onViewRoutine={() => handleViewRoutine(item.data)}
                                onChangeView={onChangeView || (() => { })}
                                offset={offset}
                            />
                        );
                    } else if (item.type === 'sparring') {
                        return (
                            <SparringReelItem
                                key={`sparring-${item.data.id}`}
                                video={item.data}
                                isActive={isActive}
                                offset={offset}
                                onChangeView={onChangeView}
                            />
                        );
                    } else if (item.type === 'lesson') {
                        return (
                            <LessonReelItem
                                key={`lesson-${item.data.id}`}
                                lesson={item.data}
                                isActive={isActive}
                                offset={offset}
                            />
                        );
                    }
                    return null;
                })}
            </div>

            {/* Countdown Progress Bar for Non-Logged-In Users */}
            {!isLoggedIn && !showLoginModal && (
                <div className="fixed bottom-0 left-0 right-0 z-[60] h-1.5 bg-transparent">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${countdownProgress}%` }}
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                    />
                </div>
            )}
        </>
    );
};
