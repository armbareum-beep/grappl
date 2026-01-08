import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    onChangeView?: () => void;
}

export const MixedReelsFeed: React.FC<MixedReelsFeedProps> = ({
    items,
    initialIndex = 0,
    onChangeView
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Drill specific interactions state
    const [likedDrills, setLikedDrills] = useState<Set<string>>(new Set());
    const [savedDrills, setSavedDrills] = useState<Set<string>>(new Set());
    const [followingCreators, setFollowingCreators] = useState<Set<string>>(new Set());

    // Mute state shared
    const [isMuted, setIsMuted] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch user interactions for drills
    useEffect(() => {
        const fetchUserInteractions = async () => {
            if (!user) return;
            try {
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

    const handleShare = async (item: any) => {
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
    );
};
