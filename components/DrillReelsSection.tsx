import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clapperboard } from 'lucide-react';
import { Drill } from '../types';
import { getDrills } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { VideoPlayer } from './VideoPlayer';

const DrillCard = ({ drill }: { drill: Drill }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [previewEnded, setPreviewEnded] = useState(false);
    const { isSubscribed, isAdmin } = useAuth();
    const canWatchFull = isSubscribed || isAdmin;

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const vimeoId = getVimeoId(drill.vimeoUrl);

    useEffect(() => {
        if (!isHovered) {
            setPreviewEnded(false);
        }
    }, [isHovered]);

    return (
        <div
            className="relative flex-none w-[280px] aspect-[9/16] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 group snap-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:border-violet-500/50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail */}
            <img
                src={drill.thumbnailUrl}
                alt={drill.title}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                    isHovered ? "opacity-0" : "opacity-100"
                )}
                loading="lazy"
            />

            {/* Video layer using VideoPlayer */}
            <div className={cn(
                "absolute inset-0 w-full h-full bg-black transition-opacity duration-300",
                isHovered && !previewEnded ? "opacity-100" : "opacity-0"
            )}>
                <VideoPlayer
                    vimeoId={vimeoId || ''}
                    title={drill.title}
                    playing={isHovered}
                    maxPreviewDuration={canWatchFull ? undefined : 10}
                    onPreviewLimitReached={() => setPreviewEnded(true)}
                    showControls={false}
                    isPaused={!isHovered || previewEnded}
                    fillContainer={true}
                />
            </div>

            {/* Preview Ended Overlay */}
            {previewEnded && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center mb-3">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                    <p className="text-white text-xs font-bold leading-tight">
                        구독 후 <br /> 전체 보기
                    </p>
                </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <span className={cn(
                    "inline-block px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider mb-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-700 text-zinc-300",
                    drill.difficulty === 'Advanced' && "border-violet-500/30 text-violet-300"
                )}>
                    {drill.difficulty}
                </span>
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-lg">
                    {drill.title}
                </h3>
            </div>

            {/* Play Icon Indicator (Hidden on hover) */}
            <div className={cn(
                "absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300",
                isHovered ? "opacity-0" : "opacity-100"
            )}>
                <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
        </div>
    );
};

export const DrillReelsSection: React.FC = () => {
    const navigate = useNavigate();
    const [dailyDrill, setDailyDrill] = useState<Drill | null>(null);

    useEffect(() => {
        const fetchDrills = async () => {
            // Fetch a batch of drills to select from
            const data = await getDrills(undefined, 50);

            if (data.length > 0) {
                // Select a drill based on the current date (Daily Rotation)
                const today = new Date();
                const seed = Math.floor(today.getTime() / (1000 * 60 * 60 * 24)); // Days since epoch
                const index = seed % data.length;
                setDailyDrill(data[index]);
            }
        };
        fetchDrills();
    }, []);

    return (
        <section className="py-24 relative overflow-hidden text-left md:text-center">
            {/* Background Elements: Subtle violet gradient mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.25),transparent_70%)] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="mb-12 flex flex-col items-center">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <Clapperboard className="w-3.5 h-3.5 text-violet-500 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                            SHORT FORM DRILLS
                        </span>
                    </div>
                    <h2 className="text-zinc-50 text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] mb-6 whitespace-pre-line text-center">
                        {"의미 없는 스크롤은 끝내고,\n60초 만에 기술 하나를 당신의 것으로."}
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto text-center">
                        릴스처럼 가볍게 보고, AI처럼 정교하게 익히세요.
                        엄선된 1,000개의 드릴이 당신의 선택을 기다립니다.
                    </p>
                </div>

                {/* Single Daily Drill Display */}
                <div className="flex justify-center pb-8">
                    {dailyDrill ? (
                        <div onClick={() => navigate(`/drills`)}>
                            {/* Scale up the single card slightly for emphasis */}
                            <div className="transform scale-110">
                                <DrillCard drill={dailyDrill} />
                            </div>
                        </div>
                    ) : (
                        /* Skeleton */
                        <div className="flex-none w-[280px] aspect-[9/16] bg-zinc-900 rounded-3xl border border-zinc-800 animate-pulse flex items-center justify-center transform scale-110">
                            <div className="w-10 h-10 rounded-full bg-zinc-800" />
                        </div>
                    )}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/drills')}
                        className="relative group bg-zinc-100 text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-violet-600 hover:text-white transition-all duration-300 overflow-hidden"
                    >
                        <span className="relative z-10">드릴 전체 보기</span>
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-300/30 to-transparent z-0 w-full h-full skew-x-12"></div>
                    </button>
                    <p className="mt-4 text-zinc-500 text-sm font-medium">
                        1,000개 이상의 드릴을 손끝에서 만나보세요.
                    </p>
                </div>
            </div>
        </section>
    );
};
