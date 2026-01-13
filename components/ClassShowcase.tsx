import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { Play, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { getCourses, getDailyFreeLesson } from '../lib/api';
import { Course } from '../types';
import { Button } from './Button';
import { VideoPlayer } from './VideoPlayer';
import { ConfirmModal } from './common/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

export const ClassShowcase: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const navigate = useNavigate();
    const { isSubscribed, isAdmin } = useAuth();

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'center',
        loop: true,
        skipSnaps: false,
        dragFree: false
    });

    const scrollPrev = React.useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = React.useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    useEffect(() => {
        fetchFeaturedCourses();
    }, []);

    const fetchFeaturedCourses = async () => {
        try {
            console.log('🔍 ClassShowcase: Fetching featured courses...');

            // Fetch both in parallel
            const [dailyRes, data] = await Promise.all([
                getDailyFreeLesson(),
                getCourses(12)
            ]);

            let finalCourses: Course[] = [];

            // 1. Transform Daily Free Lesson to a Course if it exists
            if (dailyRes.data) {
                const lesson = dailyRes.data;
                const dailyCourse: Course = {
                    id: lesson.courseId || lesson.id,
                    title: lesson.title,
                    description: lesson.description || '',
                    creatorId: lesson.creatorId || '',
                    creatorName: lesson.creatorName || 'Instructor',
                    creatorProfileImage: lesson.creatorProfileImage,
                    category: (lesson.category as any) || 'Gi',
                    difficulty: lesson.difficulty || 'All Levels',
                    thumbnailUrl: lesson.thumbnailUrl || '',
                    price: 0,
                    views: lesson.views || 0,
                    lessonCount: (lesson as any).course?.lessonCount || 1,
                    createdAt: lesson.createdAt,
                    previewVimeoId: (lesson as any).course?.preview_vimeo_id,
                    published: true
                };
                if (dailyCourse.previewVimeoId) {
                    finalCourses.push(dailyCourse);
                }
            }

            // 2. Add other courses with dedicated previews, avoiding duplicate with daily course
            const otherCourses = data.filter(course => {
                const hasPreview = !!course.previewVimeoId;
                const isNotDaily = !dailyRes.data || (course.id !== dailyRes.data.courseId);
                return hasPreview && isNotDaily;
            });

            finalCourses = [...finalCourses, ...otherCourses];

            console.log('✅ ClassShowcase: Final items:', finalCourses.length);
            setCourses(finalCourses);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching featured courses:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!courses.length) return null;

    return (
        <section className="py-24 md:py-40 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-[1400px] mx-auto relative z-10 px-4">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                            MASTERY PREVIEW
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-zinc-50 mb-6 tracking-tight break-keep">
                        블랙벨트의 독점 <br className="md:hidden" />
                        <span className="text-violet-400 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">마스터리 커리큘럼</span>
                    </h2>
                    <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium break-keep">
                        1분 미리보기로 강의 스타일을 확인하고, 자신에게 맞는 기술을 찾으세요. <br className="md:hidden" />
                        기초부터 심화까지 이어지는 블랙벨트의 완성된 로드맵을 제시합니다.
                    </p>
                </div>

                {/* Carousel Viewport */}
                <div className="relative">
                    <div className="overflow-visible" ref={emblaRef}>
                        <div className="flex">
                            {courses.map((course) => {
                                const isPlaying = playingId === course.id;
                                return (
                                    <div key={course.id} className="flex-[0_0_100%] md:flex-[0_0_90%] lg:flex-[0_0_80%] min-w-0 px-4 md:px-8">
                                        <div className="flex flex-col md:relative md:aspect-video rounded-3xl md:rounded-[3rem] overflow-hidden bg-zinc-900/50 md:bg-zinc-900 ring-1 ring-white/5 shadow-2xl group/card transition-all">
                                            {/* Video Frame */}
                                            <div className="relative aspect-video md:absolute md:inset-0">
                                                <VideoPlayer
                                                    vimeoId={course.previewVimeoId || ''}
                                                    title={course.title}
                                                    isPreviewMode={true}
                                                    maxPreviewDuration={(!isSubscribed && !isAdmin) ? 60 : undefined}
                                                    onPreviewLimitReached={() => setIsPaywallOpen(true)}
                                                    showControls={isPlaying}
                                                    playing={isPlaying}
                                                    isPaused={isPaywallOpen || (playingId !== null && !isPlaying)}
                                                />

                                                {/* Centered Action Button - Hidden when playing */}
                                                {!isPlaying && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
                                                        <button
                                                            onClick={() => setPlayingId(course.id)}
                                                            className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-violet-600/90 hover:bg-violet-500 text-white backdrop-blur-md shadow-[0_0_40px_rgba(124,58,237,0.5)] flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all group/btn"
                                                        >
                                                            <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1 group-hover:rotate-12 transition-transform" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Overlay Content (Desktop Only) - fade out when playing */}
                                            <div className={`hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}></div>

                                            {/* Info - Bottom Left (Responsive) - fade out when playing */}
                                            <div className={`relative p-6 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-12 z-20 pointer-events-none transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                                                <div className="max-w-3xl">
                                                    <h3 className="text-xl md:text-5xl font-black text-white mb-2 md:mb-4 line-clamp-2 drop-shadow-2xl break-keep">
                                                        {course.title}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-white font-bold opacity-80">
                                                        <span className="text-xs md:text-xl tracking-tight">{course.creatorName}</span>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <span className="text-xs md:text-xl font-medium">{course.lessonCount} Lessons</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center pointer-events-none z-40 px-2 lg:px-4">
                        <button
                            onClick={scrollPrev}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900/60 hover:bg-zinc-900/90 backdrop-blur-md border border-white/5 flex items-center justify-center text-white transition-all shadow-2xl md:hover:scale-110 active:scale-95 pointer-events-auto group"
                        >
                            <ChevronLeft className="w-6 h-6 md:w-10 md:h-10 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={scrollNext}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900/60 hover:bg-zinc-900/90 backdrop-blur-md border border-white/5 flex items-center justify-center text-white transition-all shadow-2xl md:hover:scale-110 active:scale-95 pointer-events-auto group"
                        >
                            <ChevronRight className="w-6 h-6 md:w-10 md:h-10 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-16 flex justify-center">
                    <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-white group px-8 py-3 rounded-full border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-900 transition-all font-medium"
                        onClick={() => navigate('/lessons')}
                    >
                        모든 클래스 둘러보기
                        <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>

            <ConfirmModal
                isOpen={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                onConfirm={() => navigate('/pricing')}
                title="무료 체험 기간 종료"
                message="전체 영상을 시청하고 모든 블랙벨트의 커리큘럼을 무제한으로 이용하려면 그랩플레이 구독을 시작하세요."
                confirmText="구독 요금제 보기"
                cancelText="더 둘러보기"
                variant="info"
            />
        </section>
    );
};
