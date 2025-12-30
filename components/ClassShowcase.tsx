import React, { useEffect, useState, useRef } from 'react';
import { getCourses } from '../lib/api';
import { Course } from '../types';
import { Button } from './Button';
import { ChevronRight, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Player from '@vimeo/player';

export const ClassShowcase: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [featuredCourse, setFeaturedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<Player | null>(null);

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
            const data = await getCourses(20);
            const validCourses = data.filter(course => {
                return course.thumbnailUrl && getVimeoId(course.previewVideoUrl);
            });

            setCourses(validCourses);
            if (validCourses.length > 0) {
                const random = validCourses[Math.floor(Math.random() * validCourses.length)];
                setFeaturedCourse(random);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching featured courses:', error);
            setLoading(false);
        }
    };

    const handleRandomize = () => {
        if (courses.length > 1) {
            let next;
            do {
                next = courses[Math.floor(Math.random() * courses.length)];
            } while (next.id === featuredCourse?.id);
            setShowVideo(false);
            setFeaturedCourse(next);
        }
    };

    const vimeoId = featuredCourse ? getVimeoId(featuredCourse.previewVideoUrl) : null;

    useEffect(() => {
        if (showVideo && iframeRef.current && !playerRef.current) {
            const player = new Player(iframeRef.current);
            playerRef.current = player;
            player.play().catch(console.error);
        }
    }, [showVideo]);

    if (loading) {
        return (
            <div className="py-24 flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!featuredCourse) return null;

    return (
        <section className="py-24 bg-zinc-950 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-violet-500 inline-block animate-pulse" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                            FREE PREVIEW
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-zinc-50 mb-6">
                        블랙벨트의 디테일, <br className="md:hidden" />
                        <span className="text-violet-400">무료로 먼저 경험하세요.</span>
                    </h2>
                    <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed">
                        결제 전에도 충분합니다. <br className="md:hidden" />
                        가장 기본이 되지만 강력한 핵심 기술들을 엄선하여 공개합니다.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto mb-16 px-4 md:px-0">
                    <div className="aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden bg-zinc-900/30 backdrop-blur-xl border border-zinc-800 shadow-2xl relative group">
                        {/* Thumbnail or Video */}
                        {!showVideo ? (
                            <>
                                <img
                                    src={featuredCourse.thumbnailUrl}
                                    alt={featuredCourse.title}
                                    className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100 group-hover:scale-105"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 transition-opacity duration-300"></div>

                                {/* Pulse Play Button */}
                                <div
                                    className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
                                    onClick={() => setShowVideo(true)}
                                >
                                    <span className="relative flex h-14 w-14 md:h-24 md:w-24">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-30 group-hover:opacity-50 transition-opacity duration-300"></span>
                                        <span className="relative inline-flex rounded-full h-14 w-14 md:h-24 md:w-24 bg-violet-600/90 backdrop-blur-sm items-center justify-center shadow-xl group-hover:bg-violet-500 transition-colors duration-300">
                                            <Play className="w-6 h-6 md:w-10 md:h-10 text-white fill-white ml-1" />
                                        </span>
                                    </span>
                                </div>

                                {/* Content Overlay - Desktop Only */}
                                <div className="hidden md:block absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div className="text-left flex-1 space-y-3">
                                            <h3
                                                className="text-3xl md:text-5xl font-black text-white leading-tight line-clamp-2 md:line-clamp-1 group-hover:text-violet-100 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/courses/${featuredCourse.id}`)}
                                            >
                                                {featuredCourse.title}
                                            </h3>
                                            <p className="text-zinc-500 font-medium text-lg">
                                                {featuredCourse.creatorName}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Right "FREE" Badge */}
                                <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
                                    <div className="px-2.5 py-1 md:px-3 md:py-1.5 bg-violet-600 rounded-full shadow-lg border border-violet-500/50">
                                        <span className="text-[10px] md:text-xs font-bold text-white tracking-wider">FREE</span>
                                    </div>
                                </div>

                                {/* Refresh Button - Bottom Right (Fixed) */}
                                <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRandomize();
                                        }}
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:rotate-180 duration-500 group/refresh"
                                        title="다른 클래스 보기"
                                    >
                                        <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 group-hover/refresh:text-white transition-colors" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            vimeoId ? (
                                <iframe
                                    ref={iframeRef}
                                    src={`https://player.vimeo.com/video/${vimeoId}?background=0&autoplay=1&muted=0&title=0&byline=0&portrait=0`}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    미리보기 영상을 불러올 수 없습니다.
                                </div>
                            )
                        )}
                    </div>

                    {/* Mobile Content - Below Video */}
                    <div className="md:hidden mt-6 px-2">
                        <h3
                            className="text-2xl font-black text-white leading-tight mb-2 cursor-pointer"
                            onClick={() => navigate(`/courses/${featuredCourse.id}`)}
                        >
                            {featuredCourse.title}
                        </h3>
                        <p className="text-zinc-500 font-medium text-base">
                            {featuredCourse.creatorName}
                        </p>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-white group px-8 py-3 rounded-full border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition-all font-medium"
                        onClick={() => navigate('/browse')}
                    >
                        모든 클래스 둘러보기
                        <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>
        </section>
    );
};
