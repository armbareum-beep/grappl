import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { useNavigate } from 'react-router-dom';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { DrillReelItem } from './DrillReelItem';

// Lazy load Modal to avoid circular dependency or bundle issues if needed
// import ShareModal from '../social/ShareModal';

interface DrillReelsFeedProps {
    drills: Drill[];
    initialIndex?: number;
    onDrillsUpdate?: (drills: Drill[]) => void; // Callback to update parent with refreshed drills
}

export const DrillReelsFeed: React.FC<DrillReelsFeedProps> = ({ drills, initialIndex = 0, onDrillsUpdate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [isMuted, setIsMuted] = useState(false);
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

    const handleProgressUpdate = useCallback((percent: number, seconds: number, hasAccess: boolean) => {
        // Parent progress handling if needed (currently session-based timer handles global UI)
        console.log('[DrillReelsFeed] Progress:', { percent, seconds, hasAccess });
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);

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

    // Auto-poll for processing status changes (Vimeo encoding completion)
    useEffect(() => {
        const hasProcessing = drills.some(d =>
            !d.vimeoUrl && (!d.videoUrl || d.videoUrl.includes('placeholder') || d.videoUrl.includes('placehold.co'))
        );

        if (!hasProcessing || !onDrillsUpdate) return; // No processing items or no callback, skip polling

        const pollInterval = setInterval(async () => {
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
                    }
                }
            } catch (err) {
                console.error('[DrillReelsFeed] Polling error:', err);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [drills, onDrillsUpdate]);

    // Navigation handlers — block swipe if the target item hasn't loaded yet
    const goToNext = () => {
        const next = currentIndex + 1;
        if (next < drills.length) {
            setCurrentIndex(next);
        }
    };

    const goToPrevious = () => {
        const prev = currentIndex - 1;
        if (prev >= 0) {
            setCurrentIndex(prev);
        }
    };

    // Session Timer Logic (20s limit)
    useEffect(() => {
        if (isSessionExpired) return;

        const interval = setInterval(() => {
            setSessionSeconds(prev => {
                const next = prev + 0.1;
                if (next >= 20) {
                    setIsSessionExpired(true);
                    clearInterval(interval);
                    return 20;
                }
                return next;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isSessionExpired]);

    useEffect(() => {
        // setCurrentProgress({ seconds: 0, percent: 0, hasAccess: true });
    }, [currentIndex]);

    // Debug: log currentIndex changes
    useEffect(() => {
        console.log('[DrillReelsFeed] currentIndex updated:', currentIndex);
    }, [currentIndex]);

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
    const handleLike = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        const isLiked = liked.has(drill.id);
        const newLiked = new Set(liked);
        if (isLiked) newLiked.delete(drill.id);
        else newLiked.add(drill.id);
        setLiked(newLiked);

        // Update count optimistically using overrideCounts
        const currentCount = overrideCounts[drill.id] ?? drill.likes ?? 0;
        // If we are LIKING (isLiked=false), add 1. If UNLIKING, subtract 1 but floor at 0.
        // NOTE: We track based on "previous applied state".
        // If isLiked was true -> Unliking -> count - 1
        // If isLiked was false -> Liking -> count + 1
        const newCount = !isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

        setOverrideCounts(prev => ({ ...prev, [drill.id]: newCount }));

        try {
            await toggleDrillLike(user.id, drill.id);
        } catch (error) {
            console.error('Like failed, rolling back:', error);
            setLiked(liked); // Revert liked set
            setOverrideCounts(prev => {
                const { [drill.id]: _, ...rest } = prev;
                return rest; // Revert to original prop value
            });
        }
    };

    const handleSave = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        const isSaved = saved.has(drill.id);
        const newSaved = new Set(saved);
        if (isSaved) newSaved.delete(drill.id);
        else newSaved.add(drill.id);
        setSaved(newSaved);

        const { saved: savedState } = await toggleDrillSave(user.id, drill.id);
        if (savedState) {
            alert('보관함에 저장되었습니다.');
        }
    };

    const handleViewRoutine = async (drill: Drill) => {
        const { getRoutineByDrillId } = await import('../../lib/api');
        const { data: routine } = await getRoutineByDrillId(drill.id);
        if (routine) navigate(`/routines/${routine.id}`);
        else alert('이 드릴은 아직 루틴에 포함되지 않았습니다.');
    };


    const handleFollow = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        const isFollowed = following.has(drill.creatorId);
        const newFollowing = new Set(following);
        if (isFollowed) newFollowing.delete(drill.creatorId);
        else newFollowing.add(drill.creatorId);
        setFollowing(newFollowing);

        try {
            await toggleCreatorFollow(user.id, drill.creatorId);
        } catch (error) {
            console.error('Error toggling follow:', error);
            // Rollback on error
            setFollowing(following);
        }
    };

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

            {/* Sliding Window: 이전 2개 + 현재 + 다음 2개 로드, 캐시된 드릴도 유지 */}
            {(() => {
                const windowOffsets = [-3, -2, -1, 0, 1, 2, 3];
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
                            isActive={isActive}
                            isMuted={isMuted}
                            onToggleMute={() => setIsMuted(!isMuted)}
                            isLiked={liked.has(drill.id)}
                            onLike={() => handleLike(drill)}
                            likeCount={overrideCounts[drill.id] ?? (drill.likes || 0)}
                            isSaved={saved.has(drill.id)}
                            onSave={() => handleSave(drill)}
                            isFollowed={following.has(drill.creatorId)}
                            onFollow={() => handleFollow(drill)}
                            onViewRoutine={() => handleViewRoutine(drill)}
                            offset={isCached ? -100 : offset}
                            isSubscriber={userPermissions.isSubscriber}
                            purchasedItemIds={userPermissions.purchasedItemIds}
                            isLoggedIn={!!user}
                            onVideoReady={() => markReady(index)}
                            onProgressUpdate={handleProgressUpdate}
                            isSessionExpired={isSessionExpired}
                            isCached={isCached}
                        />
                    );
                });
            })()}


            {/* Session Progress Bar */}
            {!userPermissions.isSubscriber && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/80 backdrop-blur-sm z-[200001]">
                    <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                        style={{
                            width: `${(sessionSeconds / 20) * 100}%`
                        }}
                    />
                </div>
            )}
        </div>
    );
};
