import React, { useEffect, useState, useRef } from 'react';
import { Lesson } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Grid, Heart, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toggleLessonLike, toggleLessonSave, getLessonInteractionStatus, toggleCreatorFollow } from '../../lib/api';

interface LessonReelItemProps {
    lesson: Lesson;
    isActive: boolean;
    offset: number;
}

export const LessonReelItem: React.FC<LessonReelItemProps> = ({ lesson, isActive, offset }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);
    const [likeCount, setLikeCount] = useState(lesson.likes || 0);

    useEffect(() => {
        if (user && isActive) {
            getLessonInteractionStatus(user.id, lesson.id, lesson.creatorId)
                .then(status => {
                    setIsLiked(status.liked);
                    setIsSaved(status.saved);
                    setIsFollowed(status.followed);
                });
        }
    }, [user, lesson.id, isActive, lesson.creatorId]);

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        await toggleLessonLike(user.id, lesson.id);
    };

    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        setIsFollowed(!isFollowed);
        await toggleCreatorFollow(user.id, lesson.creatorId);
    };

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="w-full h-full relative flex items-start justify-center pt-24">
                <div className="relative w-full max-w-[min(100vw,calc(100vh-200px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    <video
                        ref={videoRef}
                        src={lesson.videoUrl}
                        className="w-full h-full object-cover"
                        loop
                        playsInline
                        muted={muted}
                        autoPlay={isActive}
                    />
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => setMuted(!muted)} />
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />

                <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
                    <div className="relative w-full h-full max-w-[min(100vw,calc(100vh-200px))] flex">
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center py-6 pl-4 pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95 mb-4"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            <div className="absolute top-8 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                                    className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl"
                                >
                                    {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                </button>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-full aspect-square">
                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-5 z-50 pointer-events-auto items-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                                <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                            </button>
                                            <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                                        </div>
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
                                        <button className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-24 left-0 right-0 w-full px-4 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                                <div className="w-full pointer-events-auto pr-16 bg-black/30 md:bg-transparent p-4 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                    <div className="inline-block px-2 py-0.5 bg-violet-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">LESSON</div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Link to={`/creator/${lesson.creatorId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                            <span className="text-white font-bold text-sm drop-shadow-sm">{lesson.creatorName}</span>
                                        </Link>
                                        <span className="text-white/60 text-xs mt-0.5">•</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                            {isFollowed ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                    <div className="mb-2">
                                        <h3 className="font-black text-xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 md:text-3xl">{lesson.title}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
