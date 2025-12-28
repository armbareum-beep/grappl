import React, { useEffect, useState, useRef } from 'react';
import { getCourses, getCoursePreviewVideo } from '../lib/api';
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
    const [vimeoId, setVimeoId] = useState<string | null>(null);
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<Player | null>(null);

    useEffect(() => {
        fetchFeaturedCourses();
    }, []);

    const fetchFeaturedCourses = async () => {
        try {
            const data = await getCourses(20); // Get more to randomize better
            setCourses(data);
            if (data.length > 0) {
                const random = data[Math.floor(Math.random() * data.length)];
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

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        // Check if it's already just an ID
        if (/^\d+$/.test(url)) return url;
        // Try to extract from Vimeo URL
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    // Fetch preview video when course changes
    useEffect(() => {
        if (featuredCourse) {
            const initialVimeoId = getVimeoId(featuredCourse.previewVideoUrl);
            if (initialVimeoId) {
                setVimeoId(initialVimeoId);
            } else {
                // Try to get from first lesson
                getCoursePreviewVideo(featuredCourse.id).then(url => {
                    if (url) {
                        const id = getVimeoId(url);
                        if (id) setVimeoId(id);
                    }
                }).catch(() => {
                    // Silent fail
                });
            }
        } else {
            setVimeoId(null);
        }
    }, [featuredCourse]);

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
                                        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group/btn"
                                    >
                                        <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white ml-1 transition-transform group-hover/btn:scale-110" />
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
                                    onError={() => {
                                        setShowVideo(false);
                                        setVimeoId(null);
                                    }}
                                ></iframe>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 bg-slate-900">
                                    <p className="text-center mb-4 text-slate-400">미리보기 영상을 불러올 수 없습니다.</p>
                                    <button
                                        onClick={() => setShowVideo(false)}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        돌아가기
                                    </button>
                                </div>
                            )
                        )}

                        {/* Content Overlay - 모바일에서 영상 위에 겹치지 않도록 수정 */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-12 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-none">
                            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 md:gap-6 pointer-events-auto">
                                <div className="text-left flex-1 min-w-0">
                                    <h3
                                        onClick={() => navigate(`/courses/${featuredCourse.id}`)}
                                        className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-white mb-1 md:mb-2 line-clamp-2 md:line-clamp-1 cursor-pointer hover:text-blue-400 transition-colors"
                                    >
                                        {featuredCourse.title}
                                    </h3>
                                    <button
                                        onClick={() => navigate(`/creator/${featuredCourse.creatorId}`)}
                                        className="text-slate-300 text-xs sm:text-sm md:text-base font-bold hover:text-white transition-colors"
                                    >
                                        by {featuredCourse.creatorName}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 새로고침 버튼 - 오른쪽 아래 */}
                        <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 pointer-events-auto z-20">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRandomize();
                                }}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:rotate-180 duration-500"
                                title="다른 클래스 보기"
                            >
                                <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 text-slate-300 hover:text-white px-8 py-6 rounded-full transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] hover:-translate-y-1 group backdrop-blur-sm"
                        onClick={() => navigate('/browse')}
                    >
                        모든 클래스 둘러보기
                        <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1 text-slate-500 group-hover:text-white" />
                    </Button>
                </div>
            </div>
        </section>
    );
};
