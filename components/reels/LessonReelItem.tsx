import React, { useEffect, useState, useRef, memo } from 'react';
import { Lesson } from '../../types';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toggleLessonLike, getLessonInteractionStatus, toggleCreatorFollow, updateLastWatched } from '../../lib/api';
import { BaseReelItem } from './BaseReelItem';

interface LessonReelItemProps {
    lesson: Lesson;
    isActive: boolean;
    offset: number;
    isSubscriber?: boolean;
    purchasedItemIds?: string[];
    isLoggedIn?: boolean;
    isDailyFreeLesson?: boolean;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onVideoReady?: () => void;
}

export const LessonReelItem: React.FC<LessonReelItemProps> = memo(({
    lesson,
    isActive,
    offset,
    isSubscriber,
    purchasedItemIds = [],
    isLoggedIn = false,
    isDailyFreeLesson = false,
    isMuted = false,
    onToggleMute = () => { },
    onVideoReady
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);
    const [likeCount, setLikeCount] = useState((lesson as any).likes || 0);

    // Sync isPaused with BaseReelItem isn't strictly necessary if we just rely on BaseReelItem's local state, 
    // but for the watch time tick, we need to know if it's playing.
    // However, BaseReelItem handles its own pause. To keep the timer accurate, 
    // we'll actually let BaseReelItem handle the UI and just pass isActive.
    const isPausedRef = useRef(false);

    // Access Control
    const lessonPrice = Number((lesson as any).price || 0);
    const hasAccess = isDailyFreeLesson || lessonPrice === 0 || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(lesson.id)));

    // Interaction status
    useEffect(() => {
        if (user && isActive && lesson.creatorId) {
            getLessonInteractionStatus(user.id, lesson.id, lesson.creatorId)
                .then(status => {
                    setIsLiked(status.liked);
                    setIsSaved(status.saved);
                    setIsFollowed(status.followed);

                    // Self-Correction: If API says I liked it, but count is 0, it must be at least 1 locally
                    if (status.liked && likeCount === 0) {
                        setLikeCount(1);
                    }
                });
        }
    }, [user?.id, lesson.id, isActive, lesson.creatorId]);

    // Initial View Record
    useEffect(() => {
        if (isActive && user) {
            updateLastWatched(user.id, lesson.id).catch(console.error);
        }
    }, [isActive, user?.id, lesson.id]);

    // Watch time tracking (Keep existing robust logic)
    useEffect(() => {
        if (!hasAccess || !isActive || !user) return;

        let lastTick = Date.now();
        let accumulated = 0;

        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastTick) / 1000;
            lastTick = now;

            if (elapsed > 0 && elapsed < 5 && !isPausedRef.current) {
                accumulated += elapsed;
            }

            if (accumulated >= 5) {
                const send = Math.floor(accumulated);
                accumulated -= send;
                updateLastWatched(user.id, lesson.id, send).catch(console.error);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, user, lesson.id, hasAccess]);

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isLiked;
        setIsLiked(newStatus);

        // Optimistic Update with prevention of negative numbers
        setLikeCount((prev: number) => {
            if (newStatus) return prev + 1; // Like
            return Math.max(0, prev - 1); // Unlike, but floor at 0
        });

        await toggleLessonLike(user.id, lesson.id);
    };

    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!lesson.creatorId) return;
        setIsFollowed(!isFollowed);
        await toggleCreatorFollow(user.id, lesson.creatorId);
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isSaved;
        setIsSaved(newStatus);
        try {
            const { toggleLessonSave: toggle } = await import('../../lib/api');
            const result = await toggle(user.id, lesson.id);
            setIsSaved(result.saved);
        } catch (error) {
            console.error('Save failed', error);
            setIsSaved(!newStatus);
        }
    };

    return (
        <BaseReelItem
            id={lesson.id}
            type="lesson"
            title={lesson.title}
            videoUrl={lesson.vimeoUrl || lesson.videoUrl || ''}
            thumbnailUrl={lesson.thumbnailUrl}
            creatorId={lesson.creatorId}
            creatorName={lesson.creatorName}
            creatorProfileImage={lesson.creatorProfileImage}
            isActive={isActive}
            offset={offset}
            isLiked={isLiked}
            likeCount={likeCount}
            onLike={handleLike}
            isSaved={isSaved}
            onSave={handleSave}
            isFollowed={isFollowed}
            onFollow={handleFollow}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            hasAccess={hasAccess}
            isLoggedIn={isLoggedIn}
            redirectUrl={`/watch?tab=lesson&id=${lesson.id}`}
            shareText={`${lesson.creatorName}님의 레슨을 확인해보세요`}
            onVideoReady={onVideoReady}
            onPauseChange={(p) => { isPausedRef.current = p; }}
            maxPreviewDuration={60}
            renderExtraActions={() => lesson.courseId && (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/courses/${lesson.courseId}?lessonId=${lesson.id}`); }}
                    className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                    title="클래스 보기"
                >
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            )}
        />
    );
}, (prevProps, nextProps) => {
    // Only re-render if these critical props change
    return (
        prevProps.lesson.id === nextProps.lesson.id &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.offset === nextProps.offset &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.isDailyFreeLesson === nextProps.isDailyFreeLesson &&
        prevProps.isSubscriber === nextProps.isSubscriber
    );
});
