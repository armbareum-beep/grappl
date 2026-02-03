import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { Play, Clapperboard, ChevronUp, ChevronDown, Bookmark, Share2 } from 'lucide-react';
import { Drill } from '../types';
import { getDailyFreeDrill, toggleRoutineSave, checkRoutineSaved } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { VideoPlayer } from './VideoPlayer';
import { supabase } from '../lib/supabase';
import { HighlightedText } from './common/HighlightedText';
import { ReelLoginModal } from './auth/ReelLoginModal';

const ShareModal = lazy(() => import('./social/ShareModal'));

const DrillCard = ({ drill }: { drill: Drill }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [previewEnded, setPreviewEnded] = useState(false);
    const { isSubscribed, isAdmin, user } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const navigate = useNavigate();
    const canWatchFull = isSubscribed || isAdmin;

    useEffect(() => {
        if (user && drill.id) {
            checkRoutineSaved(user.id, drill.id).then(setIsSaved).catch(console.error);
        }
    }, [user, drill.id]);

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url;
        // Handle ID:HASH or ID/HASH format
        if (url.includes(':') || url.includes('/')) {
            const separator = url.includes(':') ? ':' : '/';
            const [idPart] = url.split(separator);
            if (/^\d+$/.test(idPart)) return idPart;
        }
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const vimeoId = getVimeoId(drill.vimeoUrl);

    useEffect(() => {
        if (!isHovered) {
            setPreviewEnded(false);
            setIsLoginModalOpen(false);
        }
    }, [isHovered]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await toggleRoutineSave(user.id, drill.id);
            setIsSaved(!isSaved);
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsShareModalOpen(true);
    };

    return (
        <div
            className="relative w-full h-full bg-black overflow-hidden group cursor-pointer transition-all duration-300"
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
                    onPreviewLimitReached={() => {
                        setPreviewEnded(true);
                        if (!user) {
                            setIsLoginModalOpen(true);
                        }
                    }}
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

            {/* Icons Area — Visible on hover */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Save */}
                <button
                    className={cn(
                        "p-2 rounded-full bg-black/60 backdrop-blur-sm text-white scale-90 hover:scale-100 transition-all duration-200 hover:bg-white",
                        isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                    )}
                    onClick={handleSave}
                    aria-label="저장"
                >
                    <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                </button>

                {/* Share */}
                <button
                    className="p-2 rounded-full bg-black/60 backdrop-blur-sm text-white scale-90 hover:scale-100 transition-all duration-200 hover:bg-white hover:text-zinc-900"
                    onClick={handleShare}
                    aria-label="공유"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            {/* Play Icon Indicator (Hidden on hover) */}
            <div className={cn(
                "absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300",
                isHovered ? "opacity-0" : "opacity-100"
            )}>
                <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>

            <Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={drill.title}
                        text={`${drill.creatorName || 'Grapplay'}님의 드릴을 확인해보세요!`}
                        imageUrl={drill.thumbnailUrl}
                        url={`${window.location.origin}/watch?id=${drill.id}`}
                    />
                )}
            </Suspense>

            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl="/routines"
            />
        </div>
    );
};

interface DrillReelsSectionProps {
    title?: string;
    subtitle?: string;
}

export const DrillReelsSection: React.FC<DrillReelsSectionProps> = ({ title, subtitle }) => {
    const navigate = useNavigate();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        align: 'center',
        loop: true,
        dragFree: false
    });

    const scrollPrev = React.useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = React.useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    useEffect(() => {
        const fetchDrills = async () => {
            try {
                setLoading(true);
                // 1. Get Daily Free Drill
                const dailyRes = await getDailyFreeDrill();

                // 2. Get other free drills (via routines with price 0)
                const { data: freeRoutineDrills } = await supabase
                    .from('routine_drills')
                    .select(`
                        drill:drills!inner (
                            *,
                            creator_id
                        ),
                        routines!inner (
                            price
                        )
                    `)
                    .eq('routines.price', 0)
                    .not('drills.vimeo_url', 'is', null) // Ensure vimeo_url exists
                    .limit(20);

                let finalDrills: Drill[] = [];

                if (dailyRes.data) {
                    // Ensure vimeoUrl is populated from snake_case vimeo_url
                    const dailyDrill = {
                        ...dailyRes.data,
                        vimeoUrl: dailyRes.data.vimeoUrl || (dailyRes.data as any).vimeo_url,
                        thumbnailUrl: dailyRes.data.thumbnailUrl || (dailyRes.data as any).thumbnail_url,
                        videoUrl: dailyRes.data.videoUrl || (dailyRes.data as any).video_url,
                    };
                    finalDrills.push(dailyDrill);
                }

                if (freeRoutineDrills) {
                    const dailyId = dailyRes.data?.id;
                    const others = freeRoutineDrills
                        .map((item: any) => item.drill)
                        .filter((d: any) => d && d.id !== dailyId)
                        .map((d: any) => ({
                            ...d,
                            id: d.id,
                            title: d.title,
                            description: d.description,
                            thumbnailUrl: d.thumbnail_url || d.thumbnailUrl,
                            vimeo_url: d.vimeo_url || d.vimeoUrl,
                            vimeoUrl: d.vimeo_url || d.vimeoUrl,
                            videoUrl: d.video_url || d.videoUrl,
                            creatorId: d.creator_id,
                            createdAt: d.created_at,
                            difficulty: d.difficulty,
                            category: d.category,
                            durationMinutes: d.duration_minutes
                        }));

                    // Deduplicate by ID just in case
                    const uniqueOthers = others.filter((drill, index, self) =>
                        index === self.findIndex((t) => t.id === drill.id)
                    );

                    finalDrills = [...finalDrills, ...uniqueOthers];
                }

                setDrills(finalDrills);
            } catch (e) {
                console.error('Error fetching drills:', e);
            } finally {
                setLoading(false);
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
                            FREE SHORT DRILLS
                        </span>
                    </div>
                    <h2 className="text-zinc-50 text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] mb-6 text-center">
                        {title ? <HighlightedText text={title} /> : "오늘의 무료 드릴부터,\n언제든지 체험 가능한 무료 기술까지."}
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto text-center">
                        {subtitle ? <HighlightedText text={subtitle} /> : <>따로 결제 없이 지금 바로 체험해보세요. <br /> 상하로 넘겨 60초의 핵심 디테일을 경험하실 수 있습니다.</>}
                    </p>
                </div>

                {/* Vertical Reels Container */}
                <div className="relative flex justify-center py-8">
                    <div className="relative group/carousel w-[280px] h-[500px] md:w-[320px] md:h-[570px] flex items-center">
                        {/* Vertical Indicators/Buttons - Left Side */}
                        <div className="absolute left-2 md:-left-24 flex flex-col gap-4 z-30">
                            <button
                                onClick={scrollPrev}
                                className="w-12 h-12 rounded-full bg-zinc-900/80 border border-white/5 flex items-center justify-center text-white transition-all hover:bg-violet-600 shadow-xl"
                            >
                                <ChevronUp className="w-6 h-6" />
                            </button>
                            <button
                                onClick={scrollNext}
                                className="w-12 h-12 rounded-full bg-zinc-900/80 border border-white/5 flex items-center justify-center text-white transition-all hover:bg-violet-600 shadow-xl"
                            >
                                <ChevronDown className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing rounded-[2.5rem] shadow-[0_0_80px_rgba(124,58,237,0.25)] border-4 border-zinc-800/50 bg-black" ref={emblaRef}>
                            <div className="h-full flex flex-col">
                                {loading ? (
                                    <div className="h-full w-full bg-zinc-900 animate-pulse flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                    </div>
                                ) : (
                                    drills.map((drill: Drill) => (
                                        <div
                                            key={drill.id}
                                            className="h-full w-full flex-none"
                                            onClick={() => navigate(`/watch?id=${drill.id}`)}
                                        >
                                            <div className="h-full w-full">
                                                <DrillCard drill={drill} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/library?tab=routines')}
                        className="relative group bg-zinc-100 text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-violet-600 hover:text-white transition-all duration-300 overflow-hidden"
                    >
                        <span className="relative z-10">루틴 전체 보기</span>
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-300/30 to-transparent z-0 w-full h-full skew-x-12"></div>
                    </button>
                    <p className="mt-4 text-zinc-500 text-sm font-medium">
                        체계적으로 구성된 루틴으로 훈련하세요.
                    </p>
                </div>
            </div>
        </section>
    );
};
