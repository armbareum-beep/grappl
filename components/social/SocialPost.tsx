import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Volume2, VolumeX } from 'lucide-react';
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

    return (
        <div className="py-4 px-4 hover:bg-slate-900/50 transition-colors cursor-pointer border-b border-slate-800">
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                        {post.user?.profileImage ? (
                            <img src={post.user.profileImage} alt={post.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                {post.user?.name?.[0] || '?'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{post.user?.name || 'Unknown User'}</span>
                            <span className="text-slate-500 text-xs">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
                            </span>
                        </div>
                        <button className="text-slate-500 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Text Body */}
                    <div className="mb-3">
                        <p className={`text-slate-200 text-sm whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {post.notes}
                        </p>
                        {post.notes.length > 100 && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-slate-500 text-xs mt-1 hover:text-slate-300"
                            >
                                더 보기
                            </button>
                        )}
                    </div>

                    {/* Technique Tags */}
                    {post.techniques && post.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {post.techniques.map((tech, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-medium border border-blue-800/50"
                                >
                                    #{tech}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Media */}
                    {(post.mediaUrl || post.youtubeUrl) && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-slate-800 bg-black relative max-h-[500px]">
                            {post.mediaType === 'video' || post.youtubeUrl ? (
                                <div className="relative w-full h-full">
                                    <video
                                        src={post.mediaUrl || post.youtubeUrl} // Note: youtubeUrl needs parsing if it's a real YT link, assuming direct link for now or placeholder
                                        className="w-full h-full object-cover max-h-[500px]"
                                        loop
                                        muted={isMuted}
                                        onClick={togglePlay}
                                        playsInline
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                    >
                                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    {!isPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                <Play className="w-5 h-5 text-white ml-1" />
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

                    {/* Action Bar */}
                    <div className="flex items-center gap-6 mt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className="flex items-center gap-1.5 group"
                        >
                            <Heart className={`w-5 h-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                            {likeCount > 0 && (
                                <span className={`text-xs ${liked ? 'text-red-500' : 'text-slate-500'}`}>
                                    {likeCount}
                                </span>
                            )}
                        </button>

                        <button className="flex items-center gap-1.5 group">
                            <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            {post.comments && post.comments > 0 && (
                                <span className="text-xs text-slate-500">{post.comments}</span>
                            )}
                        </button>

                        <button className="flex items-center gap-1.5 group">
                            <Share2 className="w-5 h-5 text-slate-400 group-hover:text-green-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
