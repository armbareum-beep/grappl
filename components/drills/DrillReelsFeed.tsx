import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { useNavigate } from 'react-router-dom';
import { toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, getUserFollowedCreators, toggleCreatorFollow } from '../../lib/api';
import { DrillReelItem } from './DrillReelItem';

// Lazy load Modal to avoid circular dependency or bundle issues if needed
const ShareModal = React.lazy(() => import('../social/ShareModal'));

interface DrillReelsFeedProps {
    drills: Drill[];
    onChangeView: () => void;
    initialIndex?: number;
}

export const DrillReelsFeed: React.FC<DrillReelsFeedProps> = ({ drills, onChangeView, initialIndex = 0 }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [isMuted, setIsMuted] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch user interactions
    useEffect(() => {
        const fetchUserInteractions = async () => {
            if (!user) return;
            try {
                const [likedDrills, savedDrills, followedCreators] = await Promise.all([
                    getUserLikedDrills(user.id),
                    getUserSavedDrills(user.id),
                    getUserFollowedCreators(user.id)
                ]);
                setLiked(new Set(likedDrills.map(d => d.id)));
                setSaved(new Set(savedDrills.map(d => d.id)));
                setFollowing(new Set(followedCreators));
            } catch (error) {
                console.error('Error fetching interactions:', error);
            }
        };
        fetchUserInteractions();
    }, [user]);

    // Navigation handlers
    const goToNext = () => {
        if (currentIndex < drills.length - 1) {
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
    }, [currentIndex]);

    // Mouse wheel navigation with debounce
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

    // Interaction Handlers
    const handleLike = async (drill: Drill) => {
        if (!user) { navigate('/login'); return; }

        const isLiked = liked.has(drill.id);
        const newLiked = new Set(liked);
        if (isLiked) newLiked.delete(drill.id);
        else newLiked.add(drill.id);
        setLiked(newLiked);

        await toggleDrillLike(user.id, drill.id);
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

    const handleShare = async (drill: Drill) => {
        setCurrentDrill(drill);
        setIsShareModalOpen(true);
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

    // Touch handling for Vertical Swipe (Feed Navigation)
    const [touchStart, setTouchStart] = useState<{ y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEndY = e.changedTouches[0].clientY;
        const yDistance = touchStart.y - touchEndY;

        // Vertical Swipe Threshold
        if (Math.abs(yDistance) > 50) {
            if (yDistance > 0) goToNext(); // Swipe Up
            else goToPrevious(); // Swipe Down
        }
        setTouchStart(null);
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 w-full bg-black overflow-hidden overscroll-y-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top Bar Navigation (Removed - Back button moved inside DrillReelItem) */}

            {/* Sliding Window Rendering - Expanded for better prefetch */}
            {[-2, -1, 0, 1, 2].map(offset => {
                const index = currentIndex + offset;
                if (index < 0 || index >= drills.length) return null;

                const drill = drills[index];
                const isActive = offset === 0;

                return (
                    <DrillReelItem
                        key={drill.id}
                        drill={drill}
                        isActive={isActive}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        isLiked={liked.has(drill.id)}
                        onLike={() => handleLike(drill)}
                        likeCount={(drill.likes || 0) + (liked.has(drill.id) ? 1 : 0)}
                        isSaved={saved.has(drill.id)}
                        onSave={() => handleSave(drill)}
                        isFollowed={following.has(drill.creatorId)}
                        onFollow={() => handleFollow(drill)}
                        onShare={() => handleShare(drill)}
                        onViewRoutine={() => handleViewRoutine(drill)}
                        onChangeView={onChangeView}
                        offset={offset}
                    />
                );
            })}

            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && currentDrill && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => {
                            setIsShareModalOpen(false);
                            setCurrentDrill(null);
                        }}
                        title={currentDrill.title}
                        text={currentDrill.description || `Check out this drill: ${currentDrill.title}`}
                        url={`${window.location.origin}/drills/${currentDrill.id}`}
                        imageUrl={currentDrill.thumbnailUrl}
                        initialStep="write"
                        activityType="drill_reel"
                        metadata={{
                            type: 'drill',
                            drillId: currentDrill.id,
                            drillTitle: currentDrill.title
                        }}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
