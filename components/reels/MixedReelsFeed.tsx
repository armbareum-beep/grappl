import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Drill, SparringVideo, Lesson } from '../../types';
import { DrillReelItem } from '../drills/DrillReelItem';
import { SparringReelItem } from './SparringReelItem';
import { LessonReelItem } from './LessonReelItem';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { ReelLoginModal } from '../auth/ReelLoginModal';

export type MixedItem =
    | { type: 'drill'; data: Drill }
    | { type: 'sparring'; data: SparringVideo }
    | { type: 'lesson'; data: Lesson };

interface MixedReelsFeedProps {
    items: MixedItem[];
    initialIndex?: number;
    userPermissions?: {
        isSubscriber: boolean;
        purchasedItemIds: string[];
    };
    isLoggedIn?: boolean;
    dailyFreeDrillId?: string;
}

export const MixedReelsFeed: React.FC<MixedReelsFeedProps> = ({
    items,
    initialIndex = 0,
    userPermissions: externalPermissions,
    isLoggedIn: externalIsLoggedIn,
    dailyFreeDrillId
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [userPermissions, setUserPermissions] = useState({
        isSubscriber: false,
        purchasedItemIds: [] as string[]
    });
    const isLoggedIn = externalIsLoggedIn ?? !!user;

    // Drill specific interactions state
    const [likedDrills, setLikedDrills] = useState<Set<string>>(new Set());
    const [savedDrills, setSavedDrills] = useState<Set<string>>(new Set());
    const [followingCreators, setFollowingCreators] = useState<Set<string>>(new Set());

    // Mute state shared
    const [isMuted, setIsMuted] = useState(true);

    // Login modal state for non-logged-in users (10-second timer)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const loginTimerRef = useRef<NodeJS.Timeout | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // 10-second timer for non-logged-in users to show login modal
    useEffect(() => {
        if (!isLoggedIn) {
            setWatchTime(0);
            // Start 1-second interval to update progress
            loginTimerRef.current = setInterval(() => {
                setWatchTime((prev) => {
                    const newTime = prev + 1;
                    if (newTime >= 10) {
                        setIsLoginModalOpen(true);
                        if (loginTimerRef.current) clearInterval(loginTimerRef.current);
                    }
                    return newTime;
                });
            }, 1000);
        } else {
            // Clear timer if user is logged in
            if (loginTimerRef.current) {
                clearInterval(loginTimerRef.current);
            }
            setWatchTime(0);
        }

        return () => {
            if (loginTimerRef.current) {
                clearInterval(loginTimerRef.current);
            }
        };
    }, [isLoggedIn]);

    // Fetch user interactions and permissions for drills
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) {
                if (externalPermissions) setUserPermissions(externalPermissions);
                return;
            }

            // If external permissions provided, use them
            if (externalPermissions) {
                setUserPermissions(externalPermissions);
            }

            try {
                const [liked, saved, followed, userRes, purchasesRes] = await Promise.all([
                    getUserLikedDrills(user.id),
                    getUserSavedDrills(user.id),
                    getUserFollowedCreators(user.id),
                    !externalPermissions ? supabase.from('users').select('is_subscriber').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
                    !externalPermissions ? supabase.from('purchases').select('item_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
                ]);

                setLikedDrills(new Set(liked.map(d => d.id)));
                setSavedDrills(new Set(saved.map(d => d.id)));
                setFollowingCreators(new Set(followed));

                if (!externalPermissions) {
                    setUserPermissions({
                        isSubscriber: userRes.data?.is_subscriber === true,
                        purchasedItemIds: purchasesRes.data?.map((p: any) => p.item_id) || []
                    });
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [user, externalPermissions]);

    // Navigation logic
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

    // Drill Handlers
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
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 w-full bg-black overflow-hidden overscroll-y-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
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
                            onViewRoutine={() => handleViewRoutine(item.data)}
                            offset={offset}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={isLoggedIn}
                            isDailyFreeDrill={dailyFreeDrillId === item.data.id}
                        />
                    );
                } else if (item.type === 'sparring') {
                    return (
                        <SparringReelItem
                            key={`sparring-${item.data.id}`}
                            video={item.data}
                            isActive={isActive}
                            offset={offset}
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

            {/* Login Modal for non-logged-in users */}
            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl="/watch"
            />

            {/* 10-Second Progress Bar for non-logged-in users */}
            {!isLoggedIn && !isLoginModalOpen && (
                <div className="absolute bottom-0 left-0 right-0 z-[60] h-1.5 bg-violet-900/30">
                    <div
                        className="h-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] transition-all ease-linear duration-1000"
                        style={{ width: `${(watchTime / 10) * 100}%` }}
                    />
                </div>
            )}
        </div>
    );
};
