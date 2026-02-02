import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SparringVideo } from '../types';
import { Play, Bookmark } from 'lucide-react';
import Player from '@vimeo/player';
import { toggleSparringSave, checkSparringSaved } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ContentBadge } from './common/ContentBadge';

interface SparringCardProps {
    video: SparringVideo;
    rank?: number;
    hasAccess?: boolean;
}

export const SparringCard: React.FC<SparringCardProps> = ({ video, rank, hasAccess = false }) => {
    const { user } = useAuth();
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (user && video.id) {
            checkSparringSaved(user.id, video.id).then(setIsSaved).catch(console.error);
        }
    }, [user, video.id]);

    const [isHovering, setIsHovering] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef<Player | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : url;
    };

    // Use previewVimeoId if available, otherwise fall back to main videoUrl if it's a vimeo link
    // But be careful not to expose full video if not allowed? 
    // Usually preview is different. If no preview specific ID, we might stick to thumbnail or only allow full if access.
    // However, the prompt implies "preview" on hover. 
    // If SparringVideo has a previewVimeoId, use it. If not, maybe use videoUrl ONLY IF it allows preview/embedding logic?
    // Let's assume for now we try to use videoUrl as preview if no specific preview ID exists, 
    // BUT strictly controlled by hasAccess (though hasAccess usually means full access).
    // Actually, if hasAccess is FALSE, we shouldn't play anything or play a generic preview?
    // The requirement says "권한에 따라 재생되어야 할 것 같은데". 
    // If hasAccess is true -> play. If false -> don't play.

    const [vimeoId] = useState<string | null>(
        getVimeoId(video.previewVimeoId) || getVimeoId(video.videoUrl)
    );

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHovering && hasAccess) {
            if (vimeoId) {
                timer = setTimeout(() => {
                    setShowVideo(true);
                }, 400);
            }
        } else {
            setShowVideo(false);
            playerRef.current = null;
            setProgress(0);
        }
        return () => clearTimeout(timer);
    }, [isHovering, vimeoId, video.id, hasAccess]);

    useEffect(() => {
        if (showVideo && iframeRef.current && !playerRef.current) {
            try {
                const player = new Player(iframeRef.current);
                playerRef.current = player;
                player.getDuration().then((dur) => setDuration(dur));
                player.on('timeupdate', (data) => {
                    if (!isDragging) setProgress(data.seconds);
                });
            } catch (err) {
                console.error('Failed to initialize Vimeo player:', err);
            }
        }
    }, [showVideo, isDragging]);

    const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || !playerRef.current || !duration) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = seekBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const targetTime = duration * percentage;
        setProgress(targetTime);
        playerRef.current.setCurrentTime(targetTime);
    };

    const handleSeekBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(true);
        handleSeekBarClick(e);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !seekBarRef.current || !playerRef.current || !duration) return;
            const rect = seekBarRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const targetTime = duration * percentage;
            setProgress(targetTime);
            playerRef.current.setCurrentTime(targetTime);
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, duration]);

    const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

    const isRecent = (dateStr?: string) => {
        if (!dateStr) return false;
        return new Date(dateStr).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000);
    };

    return (
        <div
            className="group flex flex-col gap-0 transition-transform duration-300 hover:-translate-y-1"
            onMouseEnter={() => setIsHovering(true && hasAccess)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                <Link to={`/sparring/${video.id}`} className="absolute inset-0 block">
                    <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-500",
                            isHovering && hasAccess ? 'scale-110' : 'group-hover:scale-105'
                        )}
                    />

                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {!showVideo && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                <Play className="w-6 h-6 text-white fill-white/20" />
                            </div>
                        </div>
                    )}
                </Link>

                {hasAccess && (
                    <div className="absolute top-2 left-2 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none z-10">
                        OWNED
                    </div>
                )}

                {/* Save Button */}
                {!hasAccess && (
                    <button
                        className={cn(
                            "absolute top-2 right-2 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                            isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                        )}
                        onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!user) return;
                            try {
                                await toggleSparringSave(user.id, video.id);
                                setIsSaved(!isSaved);
                            } catch (err) {
                                console.error(err);
                            }
                        }}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                    </button>
                )}

                {rank ? (
                    <ContentBadge type="popular" rank={rank} className="absolute bottom-2 right-2 pointer-events-none" />
                ) : isRecent(video.createdAt) ? (
                    <ContentBadge type="recent" className="absolute bottom-2 right-2 pointer-events-none" />
                ) : null}

                {showVideo && vimeoId && hasAccess && (
                    <div className="absolute inset-0 z-10 bg-black animate-fade-in pointer-events-none">
                        <iframe
                            ref={iframeRef}
                            src={`https://player.vimeo.com/video/${vimeoId}?background=1&muted=1&controls=0&badge=0&title=0&byline=0&portrait=0&dnt=1`}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            frameBorder="0"
                            allow="autoplay"
                        ></iframe>
                    </div>
                )}

                {/* Progress/Seek Bar */}
                {showVideo && isHovering && hasAccess && (
                    <div
                        ref={seekBarRef}
                        className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-white/20 cursor-pointer pointer-events-auto"
                        onMouseDown={handleSeekBarMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-violet-500 transition-all"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
            </div>

            <div>
                <Link to={`/sparring/${video.id}`} className="block leading-none">
                    <h3 className="text-white font-bold text-[13px] line-clamp-1 mb-0 leading-none group-hover:text-violet-400 transition-colors uppercase tracking-tight">{video.title}</h3>
                </Link>
                <div className="flex items-center gap-0 text-[9px] text-zinc-600 font-black uppercase tracking-widest overflow-hidden mt-0">
                    {video.category && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex-shrink-0 ${video.category === 'Competition'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                            {video.category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                        </span>
                    )}
                    <img
                        src={(video.creator as any)?.avatar_url || (video.creator as any)?.image || (video.creator as any)?.profileImage || `https://ui-avatars.com/api/?name=${video.creator?.name || 'U'}`}
                        className="w-4 h-4 rounded-full object-cover"
                        alt=""
                    />
                    <span className="truncate">{video.creator?.name || 'Unknown User'}</span>
                    <span className="flex-shrink-0">•</span>
                    <span className="flex-shrink-0">{video.views?.toLocaleString()} 조회</span>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};
