import React, { useEffect, useState, useRef } from 'react';
import { getCourses } from '../lib/api';
import { Course } from '../types';
import { Button } from './Button';
import { ChevronRight, Play, RefreshCw, Star } from 'lucide-react';
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
        // Check if it's just numbers (ID only)
        if (/^\d+$/.test(url)) return url;
        // Check standard vimeo url patterns
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    useEffect(() => {
        fetchFeaturedCourses();
    }, []);

    const fetchFeaturedCourses = async () => {
        try {
            const data = await getCourses(20); // Get more to randomize better
            // Filter courses that have a valid Vimeo ID in their preview URL
            const validCourses = data.filter(course => {
                return !!getVimeoId(course.previewVideoUrl);
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
            <div className="py-24 bg-black flex items-center justify-center min-h-[600px]">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!featuredCourse) return null;

    return (
        <section className="py-16 md:py-32 bg-black relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
                        <Star className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Recommended Class</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
                        선수들의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">실전 디테일</span>
                    </h2>
                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        매트 위에서 즉시 증명되는 월드클래스 테크닉. <br />
                        단순한 동작이 아닌, 승패를 결정짓는 핵심 디테일을 공개합니다.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto mb-16 px-4 md:px-0">
                    <div className="aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl relative group">
                        {/* Thumbnail or Video */}
                        {!showVideo ? (
                            <>
                                <img
                                    src={featuredCourse.thumbnailUrl}
                                    alt={featuredCourse.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors duration-300">
                                    <button
                                        onClick={() => setShowVideo(true)}
                                        className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group/btn"
                                    >
                                        <Play className="w-8 h-8 md:w-12 md:h-12 text-white fill-white ml-2 transition-transform group-hover/btn:scale-110" />
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
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    미리보기 영상을 불러올 수 없습니다.
                                </div>
                            )
                        )}

                        {/* Content Overlay - Desktop Only */}
                        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                            <div className="flex flex-row items-end justify-between gap-6 pointer-events-auto">
                                <div className="text-left flex-1">
                                    <h3
                                        onClick={() => navigate(`/courses/${featuredCourse.id}`)}
                                        className="text-4xl font-black text-white mb-2 line-clamp-1 cursor-pointer hover:text-blue-400 transition-colors"
                                    >
                                        {featuredCourse.title}
                                    </h3>
                                    <button
                                        onClick={() => navigate(`/creator/${featuredCourse.creatorId}`)}
                                        className="text-slate-300 font-bold hover:text-white transition-colors"
                                    >
                                        by {featuredCourse.creatorName}
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRandomize();
                                        }}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:rotate-180 duration-500"
                                        title="다른 클래스 보기"
                                    >
                                        <RefreshCw className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Refresh Button - Inside Video */}
                        <div className="md:hidden absolute bottom-4 right-4 z-20 pointer-events-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRandomize();
                                }}
                                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-95 transition-all text-white"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Content Section - Below Video */}
                    <div className="md:hidden mt-6 px-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 text-left">
                                <h3
                                    onClick={() => navigate(`/courses/${featuredCourse.id}`)}
                                    className="text-2xl font-black text-white mb-2 leading-tight cursor-pointer"
                                >
                                    {featuredCourse.title}
                                </h3>
                                <button
                                    onClick={() => navigate(`/creator/${featuredCourse.creatorId}`)}
                                    className="text-slate-400 text-sm font-bold"
                                >
                                    by {featuredCourse.creatorName}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        className="text-slate-400 hover:text-white group px-6 py-2 rounded-xl transition-all"
                        onClick={() => navigate('/browse')}
                    >
                        모든 클래스 둘러보기
                        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>
        </section>
    );
};
