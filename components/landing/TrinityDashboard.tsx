import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, BookOpen, Zap, Swords } from 'lucide-react';
import { getCourses, getDailyFreeDrill, getDailyFreeSparring, extractVimeoId, isMuxPlaybackId } from '../../lib/api';
import { Course, Drill, SparringVideo } from '../../types';
import { HighlightedText } from '../common/HighlightedText';
import { VideoPlayer } from '../VideoPlayer';

interface TrinityDashboardProps {
    title?: string;
    subtitle?: string;
}

export const TrinityDashboard: React.FC<TrinityDashboardProps> = ({ title, subtitle }) => {
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [drill, setDrill] = useState<Drill | null>(null);
    const [sparring, setSparring] = useState<SparringVideo | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesData, drillData, sparringData] = await Promise.all([
                    getCourses(1),
                    getDailyFreeDrill(),
                    getDailyFreeSparring()
                ]);

                if (coursesData.length > 0) {
                    setCourse(coursesData[0]);
                }
                if (drillData.data) {
                    setDrill(drillData.data);
                }
                if (sparringData.data) {
                    setSparring(sparringData.data);
                }
            } catch (error) {
                console.error('Error fetching trinity data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getVideoId = (url?: string) => {
        if (!url) return null;
        if (isMuxPlaybackId(url)) return url;
        if (/^\d+$/.test(url)) return url;
        if (url.includes(':') || url.includes('/')) {
            const separator = url.includes(':') ? ':' : '/';
            const [idPart] = url.split(separator);
            if (/^\d+$/.test(idPart)) return idPart;
        }
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    if (loading) {
        return (
            <section className="py-24 md:py-40 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </section>
        );
    }

    const courseVideoId = course?.previewVimeoId || null;
    const drillVideoId = drill ? (getVideoId(drill.vimeoUrl) || getVideoId(drill.videoUrl)) : null;
    const sparringVideoId = sparring ? extractVimeoId(sparring.videoUrl) : null;

    return (
        <section className="py-24 md:py-40 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-violet-900/20 rounded-full blur-[150px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-16 md:mb-20">
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                            3-STEP MASTERY ENGINE
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-zinc-50 mb-6 tracking-tight break-keep leading-tight">
                        {title ? <HighlightedText text={title} /> : <>당신의 본능을 재설계하는 <br className="md:hidden" /><span className="text-violet-400">3단계 마스터리 엔진</span></>}
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed break-keep">
                        {subtitle ? <HighlightedText text={subtitle} /> : <>지도로 경로를 파악하고, 엔진을 업데이트하고, 실전에서 증명하십시오.</>}
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

                    {/* 커리큘럼 - Large Card */}
                    <div
                        className="lg:col-span-2 group cursor-pointer"
                        onClick={() => navigate('/library?tab=classes')}
                        onMouseEnter={() => setHoveredId('curriculum')}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/50 transition-all duration-500">
                            {/* Video/Thumbnail */}
                            <div className="absolute inset-0">
                                {hoveredId === 'curriculum' && courseVideoId ? (
                                    <VideoPlayer
                                        vimeoId={courseVideoId}
                                        title="커리큘럼"
                                        isPreviewMode={true}
                                        maxPreviewDuration={30}
                                        showControls={false}
                                        playing={true}
                                        autoplay={true}
                                        fillContainer={true}
                                        muted={true}
                                    />
                                ) : (
                                    <img
                                        src={course?.thumbnailUrl || ''}
                                        alt="커리큘럼"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                )}
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                            {/* Content */}
                            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-600/80 flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-violet-400 text-xs font-bold uppercase tracking-wider">Step 1 · 지식</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">마스터리 커리큘럼</h3>
                                <p className="text-zinc-400 text-sm md:text-base mb-4 max-w-lg">
                                    전체 구조를 잡는 승리 로드맵. 기초부터 심화까지 체계적으로 설계된 블랙벨트의 커리큘럼.
                                </p>
                                <div className="flex items-center gap-2 text-violet-400 font-medium group-hover:gap-3 transition-all">
                                    <span>커리큘럼 보기</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Play indicator */}
                            {courseVideoId && (
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${hoveredId === 'curriculum' ? 'opacity-0' : 'opacity-100'}`}>
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 드릴 - Tall Card */}
                    <div
                        className="lg:row-span-2 group cursor-pointer"
                        onClick={() => navigate('/library?tab=routines')}
                        onMouseEnter={() => setHoveredId('drill')}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        <div className="relative h-[300px] md:h-[400px] lg:h-full rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/50 transition-all duration-500">
                            {/* Video/Thumbnail */}
                            <div className="absolute inset-0">
                                {hoveredId === 'drill' && drillVideoId ? (
                                    <VideoPlayer
                                        vimeoId={drillVideoId}
                                        title="드릴"
                                        isPreviewMode={true}
                                        maxPreviewDuration={30}
                                        showControls={false}
                                        playing={true}
                                        autoplay={true}
                                        fillContainer={true}
                                        muted={true}
                                    />
                                ) : (
                                    <img
                                        src={drill?.thumbnailUrl || ''}
                                        alt="드릴"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                )}
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                            {/* Content */}
                            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/80 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Step 2 · 본능</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">60초 드릴</h3>
                                <p className="text-zinc-400 text-sm md:text-base mb-4">
                                    스파링 직전, 60초 본능 패치. 핵심만 담은 숏폼 드릴로 즉시 체득.
                                </p>
                                <div className="flex items-center gap-2 text-amber-400 font-medium group-hover:gap-3 transition-all">
                                    <span>드릴 시작</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Play indicator */}
                            {drillVideoId && (
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${hoveredId === 'drill' ? 'opacity-0' : 'opacity-100'}`}>
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 스파링 - Wide Card */}
                    <div
                        className="lg:col-span-2 group cursor-pointer"
                        onClick={() => navigate('/library?tab=sparring')}
                        onMouseEnter={() => setHoveredId('sparring')}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        <div className="relative h-[300px] md:h-[350px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/50 transition-all duration-500">
                            {/* Video/Thumbnail */}
                            <div className="absolute inset-0">
                                {hoveredId === 'sparring' && sparringVideoId ? (
                                    <VideoPlayer
                                        vimeoId={sparringVideoId}
                                        title="스파링"
                                        isPreviewMode={true}
                                        maxPreviewDuration={30}
                                        showControls={false}
                                        playing={true}
                                        autoplay={true}
                                        fillContainer={true}
                                        muted={true}
                                    />
                                ) : (
                                    <img
                                        src={sparring?.thumbnailUrl || ''}
                                        alt="스파링"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                )}
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                            {/* Live Badge */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-xs font-bold text-white">REAL SPARRING</span>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/80 flex items-center justify-center">
                                        <Swords className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-rose-400 text-xs font-bold uppercase tracking-wider">Step 3 · 실전</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">실전 스파링</h3>
                                <p className="text-zinc-400 text-sm md:text-base mb-4 max-w-lg">
                                    마스터의 시야를 복제하는 실전 데이터. 컷 편집 없는 생생한 스파링으로 타이밍을 체득.
                                </p>
                                <div className="flex items-center gap-2 text-rose-400 font-medium group-hover:gap-3 transition-all">
                                    <span>스파링 보기</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Play indicator */}
                            {sparringVideoId && (
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${hoveredId === 'sparring' ? 'opacity-0' : 'opacity-100'}`}>
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
