import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Volume2, VolumeX, Sparkles, Trophy, Dumbbell, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SocialPostProps {
    post: TrainingLog;
}

export const SocialPost: React.FC<SocialPostProps> = ({ post }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);

    const handleLike = () => {
        if (liked) {
            setLikeCount(prev => prev - 1);
        } else {
            setLikeCount(prev => prev + 1);
        }
        setLiked(!liked);
    };

    const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const handleSaveRoutine = () => {
        if (!post.metadata?.sharedRoutine) return;

        try {
            const routine = post.metadata.sharedRoutine;
            const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');

            // Check for duplicates
            const isDuplicate = customRoutines.some((r: any) => r.id === routine.id || (r.title === routine.title && r.creatorId === routine.creatorId));

            if (isDuplicate) {
                alert('이미 저장된 루틴입니다.');
                return;
            }

            // Create a copy with a new custom ID if needed
            const newRoutine = {
                ...routine,
                id: routine.id.startsWith('custom-') ? routine.id : `custom-saved-${routine.id}-${Date.now()}`,
                title: routine.title,
                isSaved: true,
                savedFromFeed: true
            };

            localStorage.setItem('my_custom_routines', JSON.stringify([...customRoutines, newRoutine]));
            alert('나만의 루틴에 저장되었습니다!');
        } catch (e) {
            console.error('Error saving routine:', e);
            alert('루틴 저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="py-6 px-4 sm:px-6 hover:bg-slate-900/30 transition-colors cursor-pointer border-b border-slate-800/50">
            <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 pt-1">
                    <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800">
                        {post.user?.profileImage ? (
                            <img src={post.user.profileImage} alt={post.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
                                {post.user?.name?.[0] || '?'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-base">{post.user?.name || 'Unknown User'}</span>
                                {post.user?.belt && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                        {post.user.belt}
                                    </span>
                                )}
                            </div>
                            <span className="text-slate-500 text-sm">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
                                {post.location && !post.location.startsWith('__FEED__') && (
                                    <>
                                        <span className="mx-1">·</span>
                                        <span>{post.location}</span>
                                    </>
                                )}
                            </span>
                        </div>
                        <button className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Text Body */}
                    <div className="mb-4">
                        <p className={`text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {post.notes}
                        </p>
                        {post.notes.length > 150 && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-slate-500 text-sm mt-1 hover:text-slate-300 font-medium"
                            >
                                더 보기
                            </button>
                        )}
                    </div>

                    {/* Technique Tags */}
                    {post.techniques && post.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {post.techniques.map((tech, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
                                >
                                    #{tech}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Dynamic Content based on Type */}
                    {post.type === 'level_up' && post.metadata ? (
                        <div className="mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles className="w-24 h-24 text-yellow-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold mb-3">
                                    <Sparkles className="w-3 h-3" />
                                    LEVEL UP
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">Level {post.metadata.newLevel} 달성!</h3>
                                <p className="text-slate-400 text-sm mb-3">
                                    {post.metadata.beltName} 벨트로 한 단계 더 성장했습니다.
                                </p>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-slate-500 line-through">Lv.{post.metadata.oldLevel}</span>
                                    <span className="text-yellow-500 font-bold">Lv.{post.metadata.newLevel}</span>
                                </div>
                            </div>
                        </div>
                    ) : post.type === 'title_earned' && post.metadata ? (
                        <div className="mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Trophy className="w-24 h-24 text-purple-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold mb-3">
                                    <Trophy className="w-3 h-3" />
                                    TITLE EARNED
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{post.metadata.titleName}</h3>
                                <p className="text-slate-400 text-sm">
                                    {post.metadata.description}
                                </p>
                            </div>
                        </div>
                    ) : post.type === 'routine' && post.metadata ? (
                        <div className="mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                            <div className="flex gap-4 items-center mb-3">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Dumbbell className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg leading-tight mb-1">{post.metadata.routineTitle}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span>⏱ {post.metadata.durationMinutes}분</span>
                                        <span className="text-yellow-500 font-bold">+{post.metadata.xpEarned} XP</span>
                                    </div>
                                </div>
                            </div>
                            {post.metadata.sharedRoutine && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveRoutine();
                                    }}
                                    className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-bold rounded-lg border border-blue-500/30 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    루틴 저장하기
                                </button>
                            )}
                        </div>
                    ) : post.type === 'sparring' && post.metadata ? (
                        <div className={`mb-4 border rounded-xl p-4 ${post.metadata.result === 'win' ? 'bg-green-500/5 border-green-500/20' :
                            post.metadata.result === 'loss' ? 'bg-red-500/5 border-red-500/20' :
                                'bg-blue-500/5 border-blue-500/20'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${post.metadata.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                    post.metadata.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {post.metadata.result === 'win' ? 'WIN' : post.metadata.result === 'loss' ? 'LOSS' : 'DRAW'}
                                </span>
                                <span className="text-xs text-slate-500">{post.metadata.rounds} 라운드</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">vs</span>
                                <span className="font-bold text-white">{post.metadata.opponentName}</span>
                                <span className="text-xs text-slate-500">({post.metadata.opponentBelt})</span>
                            </div>
                        </div>
                    ) : (post.mediaUrl || post.youtubeUrl) && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800 bg-black relative shadow-lg max-h-[600px]">
                            {post.mediaType === 'video' || post.youtubeUrl ? (
                                <div className="relative w-full h-full aspect-[4/5] sm:aspect-video">
                                    <video
                                        src={post.mediaUrl || post.youtubeUrl}
                                        className="w-full h-full object-cover"
                                        loop
                                        muted={isMuted}
                                        onClick={togglePlay}
                                        playsInline
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                        className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors"
                                    >
                                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                    </button>
                                    {!isPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                                                <Play className="w-8 h-8 text-white ml-1 fill-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <img
                                    src={post.mediaUrl}
                                    alt="Post content"
                                    className="w-full h-auto object-cover"
                                />
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'}`}
                        >
                            <Heart className={`w-5 h-5 ${liked ? 'fill-pink-500' : ''}`} />
                            <span>{likeCount}</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.comments || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-green-400 transition-colors ml-auto">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
