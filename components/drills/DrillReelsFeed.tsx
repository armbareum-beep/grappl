import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { useNavigate } from 'react-router-dom';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { DrillReelItem } from './DrillReelItem';
import { useVideoPreloadSafe } from '../../contexts/VideoPreloadContext';
import { ReelLoginModal } from '../auth/ReelLoginModal';

// Lazy load Modal to avoid circular dependency or bundle issues if needed
// import ShareModal from '../social/ShareModal';

interface DrillReelsFeedProps {
    drills: Drill[];
    initialIndex?: number;
    onDrillsUpdate?: (drills: Drill[]) => void; // Callback to update parent with refreshed drills
}

// --- Optimized Session Timer: 분리하여 부모 리렌더링 방지 ---
const SessionProgressBar = memo(({ onExpired, isSubscriber }: { onExpired: () => void, isSubscriber: boolean }) => {
    const [progress, setProgress] = useState(0);
    const onExpiredRef = useRef(onExpired);

    useEffect(() => {
        onExpiredRef.current = onExpired;
    }, [onExpired]);

    useEffect(() => {
        if (isSubscriber) {
            return;
        }
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed >= 30) {
                setProgress(100);
                onExpiredRef.current();
                clearInterval(interval);
            } else {
                setProgress((elapsed / 30) * 100);
            }
        }, 100);
        return () => {
            clearInterval(interval);
        };
    }, [isSubscriber]);

    if (isSubscriber) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/80 backdrop-blur-sm z-[200001]">
            <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
});

export const DrillReelsFeed: React.FC<DrillReelsFeedProps> = ({ drills, initialIndex = 0, onDrillsUpdate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [isMuted, setIsMuted] = useState(false); // Start with sound on
    const handleToggleMute = useCallback(() => setIsMuted(prev => !prev), []);
    const [userPermissions, setUserPermissions] = useState({
        isSubscriber: false,
        purchasedItemIds: [] as string[]
    });
    // Local override for like counts to handle optimistic updates accurately without double-counting
    const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({});

    // Cache: 이전에 본 드릴 인덱스를 유지하여 재방문 시 빠른 로딩
    const [cachedIndices, setCachedIndices] = useState<number[]>([]);
    const MAX_CACHE_SIZE = 100; // 세션 내 시청한 모든 영상 캐시 (사실상 무제한)

    // currentIndex 변경 시 이전 인덱스를 캐시에 추가 (윈도우 범위 밖으로 나갈 때만)
    const prevIndexRef = useRef(initialIndex);
    useEffect(() => {
        const prevIndex = prevIndexRef.current;
        if (prevIndex !== currentIndex && prevIndex >= 0 && prevIndex < drills.length) {
            setCachedIndices(prev => {
                // 현재 윈도우에 포함된 인덱스는 캐시에서 제외 (윈도우: -2, -1, 0, 1, 2)
                const windowIndices = new Set([currentIndex - 2, currentIndex - 1, currentIndex, currentIndex + 1, currentIndex + 2]);
                const filtered = prev.filter(i => !windowIndices.has(i) && i !== prevIndex);
                // 이전 인덱스를 캐시 앞에 추가 (현재 윈도우에 없는 경우만 - 2칸 이상 이동했을 때)
                if (!windowIndices.has(prevIndex)) {
                    return [prevIndex, ...filtered].slice(0, MAX_CACHE_SIZE);
                }
                return filtered.slice(0, MAX_CACHE_SIZE);
            });
        }
        prevIndexRef.current = currentIndex;
    }, [currentIndex, drills.length]);

    const handleProgressUpdate = useCallback((_percent: number, _seconds: number, _hasAccess: boolean) => {
        // Parent progress handling if needed (currently session-based timer handles global UI)
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);
    const previewLimitReachedRef = useRef(false); // 세션 전체에서 유지되는 플래그

    // Track which items have their video ready (for blocking swipe to unloaded items)
    const [readyItems, setReadyItems] = useState<Set<number>>(() => new Set());
    const markReady = useCallback((index: number) => {
        setReadyItems(prev => {
            if (prev.has(index)) return prev;
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    }, []);

    // Track buffering state for current item (block swipe during buffering)
    const [isCurrentBuffering, setIsCurrentBuffering] = useState(false);
    const handleBufferingChange = useCallback((index: number, isBuffering: boolean) => {
        if (index === currentIndex) {
            setIsCurrentBuffering(isBuffering);
        }
    }, [currentIndex]);

    // Clear stale ready states when scrolling far (items beyond ±2 get unmounted)
    useEffect(() => {
        setReadyItems(prev => {
            const next = new Set<number>();
            for (const idx of prev) {
                if (Math.abs(idx - currentIndex) <= 2) next.add(idx);
            }
            return next.size === prev.size ? prev : next;
        });
    }, [currentIndex]);

    // Fetch user interactions and permissions
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) {
                setUserPermissions({ isSubscriber: false, purchasedItemIds: [] });
                return;
            }
            try {
                const [likedDrills, savedDrills, followedCreators, userRes, purchasesRes] = await Promise.all([
                    getUserLikedDrills(user.id),
                    getUserSavedDrills(user.id),
                    getUserFollowedCreators(user.id),
                    supabase.from('users').select('is_subscriber, is_complimentary_subscription, is_admin').eq('id', user.id).maybeSingle(),
                    (supabase.from('purchases' as any)).select('item_id').eq('user_id', user.id)
                ]);
                setLiked(new Set(likedDrills.map(d => d.id)));
                setSaved(new Set(savedDrills.map(d => d.id)));
                setFollowing(new Set(followedCreators));
                setUserPermissions({
                    isSubscriber: !!(
                        userRes.data?.is_subscriber === true ||
                        userRes.data?.is_complimentary_subscription === true ||
                        userRes.data?.is_admin === true
                    ),
                    purchasedItemIds: (purchasesRes.data as any[])?.map((p: any) => p.item_id) || []
                });
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [user?.id]);

    // Initial Preload: Load first 3 videos on mount for instant first play
    const videoPreload = useVideoPreloadSafe();


    useEffect(() => {
        if (!videoPreload || drills.length === 0) return;

        // Preload first video immediately (highest priority)
        const firstDrill = drills[0];
        if (firstDrill) {
            console.log('[DrillReelsFeed] Preloading first video:', firstDrill.id);
            videoPreload.startPreload({
                id: firstDrill.id,
                vimeoUrl: firstDrill.vimeoUrl,
                videoUrl: firstDrill.videoUrl,
            });
        }

        // Preload next 2 videos with minimal delays to beat DrillReelItem mount timing
        if (drills.length > 1) {
            setTimeout(() => {
                if (!videoPreload.isPreloadedFor(drills[1].id)) {
                    console.log('[DrillReelsFeed] Preloading second video:', drills[1].id);
                    videoPreload.startPreload({
                        id: drills[1].id,
                        vimeoUrl: drills[1].vimeoUrl,
                        videoUrl: drills[1].videoUrl,
                    });
                }
            }, 50);
        }

        if (drills.length > 2) {
            setTimeout(() => {
                if (!videoPreload.isPreloadedFor(drills[2].id)) {
                    console.log('[DrillReelsFeed] Preloading third video:', drills[2].id);
                    videoPreload.startPreload({
                        id: drills[2].id,
                        vimeoUrl: drills[2].vimeoUrl,
                        videoUrl: drills[2].videoUrl,
                    });
                }
            }, 100);
        }
    }, [drills, videoPreload]);

    // Auto-poll for processing status changes (Vimeo encoding completion)
    // Uses exponential backoff: 3s -> 4.5s -> 6.75s -> ... max 30s, max 20 attempts
    useEffect(() => {
        const hasProcessing = drills.some(d =>
            !d.vimeoUrl && (!d.videoUrl || d.videoUrl.includes('placeholder') || d.videoUrl.includes('placehold.co'))
        );

        if (!hasProcessing || !onDrillsUpdate) return; // No processing items or no callback, skip polling

        let pollCount = 0;
        let currentDelay = 3000;
        const MAX_DELAY = 30000;
        const MAX_POLLS = 20;
        let timeoutId: ReturnType<typeof setTimeout>;
        let cancelled = false;

        const poll = async () => {
            if (cancelled || pollCount >= MAX_POLLS) return;

            try {
                // Re-fetch drill list to check for processing completion
                const drillIds = drills.map(d => d.id);
                const { data: updatedDrills, error } = await supabase
                    .from('drills')
                    .select('id, vimeo_url, video_url, description_video_url, thumbnail_url, duration_minutes, length, category, difficulty, created_at, tags, likes, price')
                    .in('id', drillIds);

                if (!error && updatedDrills) {
                    // Check if any drill's video URL has been updated (processing complete)
                    const hasUpdates = updatedDrills.some((updated: any) => {
                        const original = drills.find(d => d.id === updated.id);
                        return original && (
                            updated.vimeo_url !== original.vimeoUrl ||
                            updated.video_url !== original.videoUrl
                        );
                    });

                    if (hasUpdates) {
                        // Map updated data back to Drill format
                        const refreshedDrills: Drill[] = drills.map(originalDrill => {
                            const updated = (updatedDrills as any[]).find(d => d.id === originalDrill.id);
                            if (!updated) return originalDrill;

                            return {
                                ...originalDrill,
                                vimeoUrl: updated.vimeo_url || originalDrill.vimeoUrl,
                                videoUrl: updated.video_url || originalDrill.videoUrl,
                                descriptionVideoUrl: updated.description_video_url || originalDrill.descriptionVideoUrl,
                                thumbnailUrl: updated.thumbnail_url || originalDrill.thumbnailUrl,
                                durationMinutes: updated.duration_minutes || originalDrill.durationMinutes,
                                length: updated.length?.toString() || originalDrill.length,
                            };
                        });

                        console.log('[DrillReelsFeed] Detected processing completion, updating drills...');
                        onDrillsUpdate(refreshedDrills);
                        return; // Stop polling on success
                    }
                }
            } catch (err) {
                console.error('[DrillReelsFeed] Polling error:', err);
            }

            // Schedule next poll with exponential backoff
            pollCount++;
            currentDelay = Math.min(currentDelay * 1.5, MAX_DELAY);
            if (!cancelled && pollCount < MAX_POLLS) {
                timeoutId = setTimeout(poll, currentDelay);
            }
        };

        // Start first poll
        timeoutId = setTimeout(poll, currentDelay);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [drills, onDrillsUpdate]);

    // Navigation handlers — allow swipe but block during buffering
    const goToNext = useCallback(() => {
        if (isCurrentBuffering) return; // Block swipe during buffering
        const nextIdx = currentIndex + 1;
        if (nextIdx < drills.length) {
            setCurrentIndex(nextIdx);
            setIsCurrentBuffering(true); // Assume buffering until new video signals otherwise
        }
    }, [currentIndex, drills.length, isCurrentBuffering]);

    const goToPrevious = useCallback(() => {
        if (isCurrentBuffering) return; // Block swipe during buffering
        const prevIdx = currentIndex - 1;
        if (prevIdx >= 0) {
            setCurrentIndex(prevIdx);
            setIsCurrentBuffering(true); // Assume buffering until new video signals otherwise
        }
    }, [currentIndex, isCurrentBuffering]);

    // Session Timer Logic (30s limit) - Now handled by SessionProgressBar
    const handleSessionExpired = useCallback(() => {
        setIsSessionExpired(true);
        setIsLoginModalOpen(true);
    }, []);

    useEffect(() => {
        // setCurrentProgress({ seconds: 0, percent: 0, hasAccess: true });
    }, [currentIndex]);

    // Debug: log currentIndex changes
    useEffect(() => {
        console.log('[DrillReelsFeed] currentIndex updated:', currentIndex);
    }, [currentIndex]);

    // Proactive Preloading: Trigger preload for next/prev videos when currentIndex changes
    useEffect(() => {
        if (!videoPreload || drills.length === 0) return;

        const preloadTargets: { index: number; drill: any }[] = [];

        // Next videos (priority: +1, +2)
        if (currentIndex + 1 < drills.length) {
            preloadTargets.push({ index: currentIndex + 1, drill: drills[currentIndex + 1] });
        }
        if (currentIndex + 2 < drills.length) {
            preloadTargets.push({ index: currentIndex + 2, drill: drills[currentIndex + 2] });
        }

        // Previous videos (for backward swipe support: -1, -2)
        if (currentIndex - 1 >= 0) {
            preloadTargets.push({ index: currentIndex - 1, drill: drills[currentIndex - 1] });
        }
        if (currentIndex - 2 >= 0) {
            preloadTargets.push({ index: currentIndex - 2, drill: drills[currentIndex - 2] });
        }

        // Stagger preloads to avoid network congestion
        preloadTargets.forEach((target, idx) => {
            const delay = idx * 100; // 100ms between each preload for faster responsiveness

            setTimeout(() => {
                // Check if already preloaded
                if (videoPreload.isPreloadedFor(target.drill.id)) {
                    console.log('[DrillReelsFeed] Already preloaded:', target.drill.id);
                    return;
                }

                const offset = target.index - currentIndex;
                console.log(`[DrillReelsFeed] Preloading drill at offset ${offset}:`, target.drill.id);
                videoPreload.startPreload({
                    id: target.drill.id,
                    vimeoUrl: target.drill.vimeoUrl,
                    videoUrl: target.drill.videoUrl,
                });
            }, delay);
        });
    }, [currentIndex, drills, videoPreload]);

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
    }, [currentIndex]);

    // Mouse wheel navigation
    const lastScrollTime = useRef(0);
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = Date.now();

            // Cooldown 800ms to prevent double skipping
            if (now - lastScrollTime.current < 800) return;

            // Threshold significantly reduced for better sensitivity, but high enough to avoid jitter
            if (Math.abs(e.deltaY) > 20) {
                if (e.deltaY > 0) {
                    goToNext();
                } else {
                    goToPrevious();
                }
                lastScrollTime.current = now;
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [currentIndex, readyItems, drills.length]); // Added readyItems dependency since goToNext uses it

    // Interaction Handlers
    const handleLike = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        let currentIsLiked = false;
        setLiked(prev => {
            currentIsLiked = prev.has(drill.id);
            const next = new Set(prev);
            if (currentIsLiked) next.delete(drill.id);
            else next.add(drill.id);
            return next;
        });

        // Update count optimistically
        setOverrideCounts(prev => {
            const currentCount = prev[drill.id] ?? drill.likes ?? 0;
            const newCount = !currentIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            return { ...prev, [drill.id]: newCount };
        });

        try {
            await toggleDrillLike(user.id, drill.id);
        } catch (error) {
            console.error('Like failed, rolling back:', error);
            setLiked(prev => {
                const next = new Set(prev);
                if (currentIsLiked) next.add(drill.id);
                else next.delete(drill.id);
                return next;
            });
            setOverrideCounts(prev => {
                const { [drill.id]: _, ...rest } = prev;
                return rest;
            });
        }
    }, [user, navigate]);

    const handleSave = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        setSaved(prev => {
            const next = new Set(prev);
            if (prev.has(drill.id)) next.delete(drill.id);
            else next.add(drill.id);
            return next;
        });

        const { saved: savedState } = await toggleDrillSave(user.id, drill.id);
        if (savedState) {
            alert('보관함에 저장되었습니다.');
        }
    }, [user, navigate]);

    const handleViewRoutine = useCallback(async (drill: Drill) => {
        const { getRoutineByDrillId } = await import('../../lib/api');
        const { data: routine } = await getRoutineByDrillId(drill.id);
        if (routine) navigate(`/routines/${routine.id}`);
        else alert('이 드릴은 아직 루틴에 포함되지 않았습니다.');
    }, [navigate]);

    const handleFollow = useCallback(async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        let currentIsFollowing = false;
        setFollowing(prev => {
            currentIsFollowing = prev.has(drill.creatorId);
            const next = new Set(prev);
            if (currentIsFollowing) next.delete(drill.creatorId);
            else next.add(drill.creatorId);
            return next;
        });

        try {
            await toggleCreatorFollow(user.id, drill.creatorId);
        } catch (error) {
            console.error('Error toggling follow:', error);
            setFollowing(prev => {
                const next = new Set(prev);
                if (currentIsFollowing) next.add(drill.creatorId);
                else next.delete(drill.creatorId);
                return next;
            });
        }
    }, [user, navigate]);

    // Touch handling for Vertical Swipe (Feed Navigation) & Horizontal (Like)
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const xDistance = touchStart.x - touchEndX;
        const yDistance = touchStart.y - touchEndY;

        // Determine if horizontal or vertical swipe
        if (Math.abs(xDistance) > Math.abs(yDistance)) {
            // Horizontal Swipe - Handled by DrillReelItem for video switching
            // Do NOT handle here to avoid conflicts
        } else {
            // Vertical Swipe Threshold (Feed Navigation)
            if (Math.abs(yDistance) > 50) {
                if (yDistance > 0) goToNext(); // Swipe Up
                else goToPrevious(); // Swipe Down
            }
        }
        setTouchStart(null);
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[200000] bg-black overflow-hidden touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top Bar Navigation (Removed - Back button moved inside DrillReelItem) */}

            {/* Sliding Window: 이전 1개 + 현재 + 다음 2개 로드 (최적화: 7개 → 4개) */}
            {(() => {
                const windowOffsets = [-1, 0, 1, 2];
                const renderIndices = windowOffsets
                    .map(o => currentIndex + o)
                    .filter(i => i >= 0 && i < drills.length);

                return renderIndices.map(index => {
                    const drill = drills[index];
                    const offset = index - currentIndex;
                    const isActive = index === currentIndex;
                    const isCached = cachedIndices.includes(index);

                    return (
                        <DrillReelItem
                            key={drill.id}
                            drill={drill}
                            index={index} // Pass index to let item call back with it
                            isActive={isActive}
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
                            isLiked={liked.has(drill.id)}
                            onLike={handleLike}
                            likeCount={overrideCounts[drill.id] ?? (drill.likes || 0)}
                            isSaved={saved.has(drill.id)}
                            onSave={handleSave}
                            isFollowed={following.has(drill.creatorId)}
                            onFollow={handleFollow}
                            onViewRoutine={handleViewRoutine}
                            offset={isCached ? -100 : offset}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={!!user}
                            onVideoReady={markReady}
                            onBufferingChange={handleBufferingChange}
                            onProgressUpdate={handleProgressUpdate}
                            isSessionExpired={isSessionExpired}
                            isCached={isCached}
                            previewLimitReachedRef={previewLimitReachedRef}
                        />
                    );
                });
            })()}


            {/* Session Progress Bar: 별도 컴포넌트로 분리하여 리렌더링 최소화 */}
            <SessionProgressBar
                onExpired={handleSessionExpired}
                isSubscriber={userPermissions.isSubscriber}
            />

            {/* Login Modal: 30초 후 자동 표시 */}
            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl="/drills"
            />
        </div>
    );
};
