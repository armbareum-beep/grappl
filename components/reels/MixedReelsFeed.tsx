import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Drill, SparringVideo, Lesson } from '../../types';
import { DrillReelItem } from '../drills/DrillReelItem';
import { SparringReelItem } from './SparringReelItem';
import { LessonReelItem } from './LessonReelItem';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

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
    dailyFreeLessonId?: string;
    dailyFreeSparringId?: string;
    dailyFreeDrillId?: string;
}

export const MixedReelsFeed: React.FC<MixedReelsFeedProps> = ({
    items,
    initialIndex = 0,
    userPermissions: externalPermissions,
    isLoggedIn: externalIsLoggedIn,
    dailyFreeLessonId,
    dailyFreeSparringId,
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
    // Local override for like counts to handle optimistic updates accurately without double-counting
    const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({});

    // Mute state shared - default to false to attempt autoplay with sound
    const [isMuted, setIsMuted] = useState(false);
    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track which items have their video ready (for blocking swipe to unloaded items)
    // Initialize with current index so first item is always swipeable
    const [readyItems, setReadyItems] = useState<Set<number>>(() => new Set([initialIndex]));
    const pendingTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

    const markReady = useCallback((index: number) => {
        console.log('[MixedReelsFeed] markReady called for index:', index);

        // Clear any pending timeout for this index
        const timeout = pendingTimeouts.current.get(index);
        if (timeout) {
            clearTimeout(timeout);
            pendingTimeouts.current.delete(index);
        }

        setReadyItems(prev => {
            if (prev.has(index)) {
                console.log('[MixedReelsFeed] Index already ready:', index);
                return prev;
            }
            const next = new Set(prev);
            next.add(index);
            console.log('[MixedReelsFeed] Added to readyItems:', index, 'Total:', next.size);
            return next;
        });
    }, []);

    // Auto-ready neighbors after timeout (fallback if video fails to load)
    // Neighbor preload timeout - DON'T include readyItems in deps to avoid canceling timeouts
    useEffect(() => {
        const neighborsToPreload = [-1, 1].map(offset => currentIndex + offset)
            .filter(idx => idx >= 0 && idx < items.length);

        neighborsToPreload.forEach(idx => {
            // Check pendingTimeouts to avoid duplicates (readyItems check happens in markReady)
            if (!pendingTimeouts.current.has(idx)) {
                console.log('[MixedReelsFeed] Setting timeout for neighbor index:', idx);
                const timeout = setTimeout(() => {
                    console.log('[MixedReelsFeed] Timeout: forcing ready for index', idx);
                    pendingTimeouts.current.delete(idx);
                    markReady(idx);
                }, 1500); // 1.5초 후 자동 ready
                pendingTimeouts.current.set(idx, timeout);
            }
        });

        // Only cleanup old timeouts that are no longer neighbors
        pendingTimeouts.current.forEach((timeout, idx) => {
            if (Math.abs(idx - currentIndex) > 1) {
                clearTimeout(timeout);
                pendingTimeouts.current.delete(idx);
            }
        });
    }, [currentIndex, items.length, markReady]);

    // Clear stale ready states when scrolling far (items beyond ±2 get unmounted)
    useEffect(() => {
        setReadyItems(prev => {
            const next = new Set<number>();
            // Always keep current index ready
            next.add(currentIndex);
            for (const idx of prev) {
                if (Math.abs(idx - currentIndex) <= 2) next.add(idx);
            }
            return next.size === prev.size ? prev : next;
        });
    }, [currentIndex]);

    // Watch time tracking for non-logged-in users moved to individual items

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
                    !externalPermissions ? supabase.from('users').select('is_subscriber, is_complimentary_subscription, is_admin').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
                    !externalPermissions ? supabase.from('purchases').select('item_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
                ]);

                setLikedDrills(new Set(liked.map(d => d.id)));
                setSavedDrills(new Set(saved.map(d => d.id)));
                setFollowingCreators(new Set(followed));

                if (!externalPermissions) {
                    const isSubscribed = !!(
                        userRes.data?.is_subscriber === true ||
                        userRes.data?.is_complimentary_subscription === true ||
                        userRes.data?.is_admin === true ||
                        userRes.data?.is_admin === 1
                    );

                    setUserPermissions({
                        isSubscriber: isSubscribed,
                        purchasedItemIds: purchasesRes.data?.map((p: any) => p.item_id) || []
                    });
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [user?.id, externalPermissions]);

    // Navigation logic — block swipe if the target item hasn't loaded yet
    // SIMPLIFIED: Always allow swipe, no blocking
    const goToNext = useCallback(() => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            if (next < items.length) {
                return next;
            }
            return prev;
        });
    }, [items.length]);

    const goToPrevious = useCallback(() => {
        setCurrentIndex(prev => {
            const prevIdx = prev - 1;
            if (prevIdx >= 0) {
                return prevIdx;
            }
            return prev;
        });
    }, []);

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
    }, [goToNext, goToPrevious]);

    // Mouse wheel navigation
    const lastScrollTime = useRef(0);
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = Date.now();

            // Cooldown 800ms
            if (now - lastScrollTime.current < 800) return;

            if (Math.abs(e.deltaY) > 20) {
                if (e.deltaY > 0) goToNext();
                else goToPrevious();
                lastScrollTime.current = now;
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [goToNext, goToPrevious]);

    // Touch handling
    const touchStartRef = useRef<{ y: number } | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartRef.current = { y: e.targetTouches[0].clientY };
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const touchEndY = e.changedTouches[0].clientY;
        const yDistance = touchStartRef.current.y - touchEndY;

        if (Math.abs(yDistance) > 50) {
            if (yDistance > 0) goToNext();
            else goToPrevious();
        }
        touchStartRef.current = null;
    }, [goToNext, goToPrevious]);

    // Drill Handlers - memoized to prevent re-renders
    const handleDrillLike = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        const isLiked = likedDrills.has(drill.id);
        setLikedDrills(prev => {
            const newSet = new Set(prev);
            if (newSet.has(drill.id)) newSet.delete(drill.id);
            else newSet.add(drill.id);
            return newSet;
        });

        // Update count optimistically using overrideCounts
        setOverrideCounts(prev => {
            const currentCount = prev[drill.id] ?? drill.likes ?? 0;
            // If we are LIKING (!isLiked), add 1. If UNLIKING, subtract 1 but floor at 0.
            const newCount = !isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            return { ...prev, [drill.id]: newCount };
        });

        await toggleDrillLike(user.id, drill.id);
    }, [user, navigate, likedDrills]);

    const handleDrillSave = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }
        setSavedDrills(prev => {
            const newSet = new Set(prev);
            if (newSet.has(drill.id)) newSet.delete(drill.id);
            else newSet.add(drill.id);
            return newSet;
        });
        await toggleDrillSave(user.id, drill.id);
    }, [user, navigate]);

    const handleDrillFollow = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }
        setFollowingCreators(prev => {
            const newSet = new Set(prev);
            if (newSet.has(drill.creatorId)) newSet.delete(drill.creatorId);
            else newSet.add(drill.creatorId);
            return newSet;
        });
        await toggleCreatorFollow(user.id, drill.creatorId);
    }, [user, navigate]);

    const handleViewRoutine = useCallback(async (drill: Drill) => {
        try {
            const { getRoutineByDrillId } = await import('../../lib/api');
            const { data: routine } = await getRoutineByDrillId(drill.id);
            if (routine) {
                navigate(`/routines/${routine.id}`);
            }
        } catch (error) {
            console.error('Error fetching routine for drill:', error);
        }
    }, [navigate]);

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

                // Always render neighbors (offset ±1, ±2) for preloading
                // The readyItems check only blocks SWIPING, not RENDERING

                if (item.type === 'drill') {
                    return (
                        <DrillReelItem
                            key={`drill-${item.data.id}`}
                            drill={item.data}
                            isActive={isActive}
                            isMuted={!isActive || isMuted}
                            onToggleMute={toggleMute}
                            isLiked={likedDrills.has(item.data.id)}
                            onLike={() => handleDrillLike(item.data)}
                            likeCount={overrideCounts[item.data.id] ?? (item.data.likes || 0)}
                            isSaved={savedDrills.has(item.data.id)}
                            onSave={() => handleDrillSave(item.data)}
                            isFollowed={followingCreators.has(item.data.creatorId)}
                            onFollow={() => handleDrillFollow(item.data)}
                            onViewRoutine={() => handleViewRoutine(item.data)}
                            isDailyFreeDrill={dailyFreeDrillId === item.data.id}
                            offset={offset}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={isLoggedIn}
                            onVideoReady={() => markReady(index)}
                        />
                    );
                } else if (item.type === 'sparring') {
                    return (
                        <SparringReelItem
                            key={`sparring-${item.data.id}`}
                            video={item.data}
                            isActive={isActive}
                            offset={offset}
                            isDailyFreeSparring={dailyFreeSparringId === item.data.id}
                            dailyFreeId={dailyFreeSparringId}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={isLoggedIn}
                            isMuted={!isActive || isMuted}
                            onToggleMute={toggleMute}
                            onVideoReady={() => markReady(index)}
                        />
                    );
                } else if (item.type === 'lesson') {
                    return (
                        <LessonReelItem
                            key={`lesson-${item.data.id}`}
                            lesson={item.data}
                            isActive={isActive}
                            offset={offset}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={isLoggedIn}
                            isDailyFreeLesson={dailyFreeLessonId === item.data.id}
                            isMuted={!isActive || isMuted}
                            onToggleMute={toggleMute}
                            onVideoReady={() => markReady(index)}
                        />
                    );
                }
                return null;
            })}

            {/* Loading indicators removed - swipe is always allowed now */}
        </div>
    );
};
