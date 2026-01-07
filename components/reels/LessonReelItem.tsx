import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Volume2, VolumeX, PlayCircle, ChevronLeft, Heart, Bookmark, Share2, BookOpen } from 'lucide-react';
import { Lesson } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserFollowedCreators, toggleCreatorFollow, toggleLessonSave, checkLessonSaved } from '../../lib/api';

const ShareModal = React.lazy(() => import('../social/ShareModal'));

interface LessonReelItemProps {
    lesson: Lesson;
    isActive: boolean;
    offset: number;
}

export const LessonReelItem: React.FC<LessonReelItemProps> = ({ lesson, isActive, offset }) => {
    const [muted, setMuted] = useState(true);
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Get creator info from lesson
    const creatorName = lesson.creatorName || 'Instructor';
    const creatorId = lesson.creatorId || '';
    const creatorImage = lesson.creatorProfileImage || `https://ui-avatars.com/api/?name=${creatorName}`;

    // Check if following and saved
    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return;
            try {
                const [followed, saved] = await Promise.all([
                    creatorId ? getUserFollowedCreators(user.id) : Promise.resolve([]),
                    checkLessonSaved(user.id, lesson.id)
                ]);
                if (creatorId) setIsFollowed(followed.includes(creatorId));
                setIsSaved(saved);
            } catch (error) {
                console.error('Error checking status:', error);
            }
        };
        checkStatus();
    }, [user, creatorId, lesson.id]);

    const handleFollow = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await toggleCreatorFollow(user.id, creatorId);
            setIsFollowed(!isFollowed);
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setIsLiked(!isLiked);
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="h-full w-full relative bg-black flex items-start justify-center pt-[16.666%]">
                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    {lesson.vimeoUrl && isActive ? (
                        <iframe
                            src={`https://player.vimeo.com/video/${lesson.vimeoUrl.split('/').pop()}?background=1&autoplay=1&loop=1&muted=${muted ? 1 : 0}`}
                            className="w-full h-full object-cover"
                            allow="autoplay; fullscreen; picture-in-picture"
                            title={lesson.title}
                            style={{ pointerEvents: 'none' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <PlayCircle className="w-16 h-16 text-zinc-800" />
                        </div>
                    )}
                </div>

                {/* Content Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-10" />

                {/* Top-Left Group: Back Button */}
                <div className="absolute top-8 left-4 z-[100]">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Top-Right Group: Speaker */}
                <div className="absolute top-8 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                        className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl"
                    >
                        {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                </div>

                {/* Middle-Right Group: Like, Save, Share */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full">
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-5 z-50 pointer-events-auto items-center">
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLike(); }}
                                    className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                >
                                    <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                </button>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/courses/${lesson.courseId}`); }}
                                className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                            >
                                <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!user) { navigate('/login'); return; }
                                    const { saved } = await toggleLessonSave(user.id, lesson.id);
                                    setIsSaved(saved);
                                }}
                                className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                            >
                                <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-white' : ''}`} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                            >
                                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Info - Drill Style */}
                <div className="absolute left-0 right-0 w-full bottom-24 px-6 z-40 pointer-events-none">
                    <div className="flex items-end justify-between pointer-events-auto">
                        {/* Info - Always inside video */}
                        <div className="flex-1 pr-16">
                            <div className="inline-block px-2 py-0.5 bg-blue-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">LESSON</div>
                            <div className="flex items-center gap-3 mb-3">
                                <Link
                                    to={`/creator/${creatorId}`}
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                    <img
                                        src={creatorImage}
                                        alt=""
                                        className="w-8 h-8 rounded-full border border-white/20 object-cover"
                                    />
                                    <span className="text-white font-bold text-sm drop-shadow-sm">
                                        {creatorName}
                                    </span>
                                </Link>
                                <span className="text-white/60 text-xs leading-none mt-0.5">•</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed
                                        ? 'bg-violet-600 text-white border-violet-600'
                                        : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'
                                        }`}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>

                            <h2 className="text-white font-bold text-base mb-2 line-clamp-2 drop-shadow-sm">
                                {lesson.title}
                            </h2>

                            {lesson.courseTitle && (
                                <p className="text-white/80 text-xs mb-2">{lesson.courseTitle}</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={lesson.title}
                        text={lesson.description}
                        url={window.location.href}
                        imageUrl={lesson.thumbnailUrl}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
