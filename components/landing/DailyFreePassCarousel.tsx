import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

interface DailyFreePassCarouselProps {
    dailyDrill: any;
    dailyLesson: any;
    dailySparring: any;
}

export const DailyFreePassCarousel: React.FC<DailyFreePassCarouselProps> = ({
    dailyDrill,
    dailyLesson,
    dailySparring
}) => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'center',
        containScroll: 'trimSnaps'
    });

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setCurrentSlide(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect); };
    }, [emblaApi]);

    const getCarouselAspect = () => 'aspect-[4/5] md:aspect-square lg:aspect-[16/9] w-full max-w-6xl';

    const slides = [
        dailyLesson && { type: 'lesson', data: dailyLesson },
        dailyDrill && { type: 'drill', data: dailyDrill },
        dailySparring && { type: 'sparring', data: dailySparring }
    ].filter(Boolean);

    if (slides.length === 0) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800 p-12 rounded-[32px] text-center w-full max-w-6xl">
                <p className="text-zinc-500 font-medium tracking-widest uppercase">Initializing Daily Pass Items...</p>
            </div>
        );
    }

    return (
        <div className="w-full relative">
            <div className={`relative group overflow-hidden rounded-[24px] md:rounded-[32px] shadow-2xl shadow-black/50 border border-white/5 transition-all duration-700 ease-in-out md:max-h-[600px] mx-auto w-full cursor-grab active:cursor-grabbing ${getCarouselAspect()}`} ref={emblaRef}>
                <div className="flex h-full">
                    {slides.map((slide, idx) => {
                        if (!slide || !slide.data) return null;

                        if (slide.type === 'drill') {
                            const drill = slide.data;
                            return (
                                <div key={`slide-drill-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                    <div className="relative w-full h-full overflow-hidden">
                                        {drill.thumbnailUrl ? (
                                            <img src={drill.thumbnailUrl} className="absolute object-cover object-center" style={{ width: '145%', height: '145%', maxWidth: 'none', left: '-22.5%', top: '-22.5%' }} alt={drill.title} />
                                        ) : (
                                            <div className="absolute inset-0 bg-zinc-900" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
                                        <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                            <div className="flex flex-col items-start gap-6 max-w-3xl">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 드릴</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                </div>
                                                <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                    {drill.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                            {drill.creatorProfileImage ? (
                                                                <img src={drill.creatorProfileImage} className="w-full h-full object-cover" alt={`${drill.creatorName || '크리에이터'} 프로필`} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{drill.creatorName?.charAt(0) || 'U'}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-white">{drill.creatorName || 'Grapplay Team'}</span>
                                                    </div>
                                                    <span className="text-zinc-400">{drill.category || 'Fundamentals'}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate(`/drills?id=${drill.id}`)} className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                <Play className="w-6 h-6 fill-current" /> 훈련 시작 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (slide.type === 'lesson') {
                            const lesson = slide.data;
                            return (
                                <div key={`slide-lesson-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                    <div className="relative w-full h-full overflow-hidden">
                                        {lesson.thumbnailUrl ? (
                                            <img src={lesson.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover object-center" alt={lesson.title} />
                                        ) : (
                                            <div className="absolute inset-0 bg-zinc-900" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
                                        <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                            <div className="flex flex-col items-start gap-6 max-w-4xl">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 레슨</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                </div>
                                                <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                    {lesson.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                            {lesson.creatorProfileImage ? (
                                                                <img src={lesson.creatorProfileImage} className="w-full h-full object-cover" alt={`${lesson.creatorName || '크리에이터'} 프로필`} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{lesson.creatorName?.charAt(0) || 'U'}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-white">{lesson.creatorName || 'Grapplay Team'}</span>
                                                    </div>
                                                    <span className="text-zinc-400">{lesson.courseTitle || 'Exclusive Course'}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate(`/courses/${lesson.courseId}?lessonId=${lesson.id}`)} className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                <Play className="w-6 h-6 fill-current" /> 레슨 보기 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (slide.type === 'sparring') {
                            const sparring = slide.data;
                            return (
                                <div key={`slide-sparring-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                    <div className="relative w-full h-full overflow-hidden">
                                        {sparring.thumbnailUrl ? (
                                            <img src={sparring.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover object-center" alt={sparring.title} />
                                        ) : (
                                            <div className="absolute inset-0 bg-zinc-900" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
                                        <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                            <div className="flex flex-col items-start gap-6 max-w-4xl">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 스파링</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                </div>
                                                <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                    {sparring.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2 pr-4 border-white/10">
                                                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                            {(sparring.creator as any)?.profileImage || (sparring.creator as any)?.avatar_url ? (
                                                                <img src={(sparring.creator as any)?.profileImage || (sparring.creator as any)?.avatar_url} className="w-full h-full object-cover" alt={`${typeof sparring.creator?.name === 'string' ? sparring.creator.name : '크리에이터'} 프로필`} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{(sparring.creator?.name as string)?.charAt(0) || 'U'}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-white">{typeof sparring.creator?.name === 'string' ? sparring.creator.name : 'Unknown Grappler'}</span>
                                                    </div>
                                                    <span className="text-zinc-400">{sparring.category || 'Sparring Session'}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate(`/library?tab=sparring&id=${sparring.id}&view=reels`)} className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                <Play className="w-6 h-6 fill-current" /> 스파링 보기 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>

                {/* Navigation Indicators */}
                <div className="absolute bottom-6 right-12 z-20 flex gap-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                emblaApi?.scrollTo(idx);
                            }}
                            className={`group relative flex items-center gap-2 transition-all duration-300 outline-none ${idx === currentSlide ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                        >
                            <div className={`h-1.5 rounded-full shadow-sm transition-all duration-500 ease-out ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/70'}`} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
