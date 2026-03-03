import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Activity } from 'lucide-react';
import { getDailyFreeSparring, extractVimeoId } from '../lib/api';
import { SparringVideo } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { HighlightedText } from './common/HighlightedText';
import { useAuth } from '../contexts/AuthContext';
import { ReelLoginModal } from './auth/ReelLoginModal';

export function RandomSparringShowcase({ title, subtitle }: { title?: string; subtitle?: string }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [video, setVideo] = useState<SparringVideo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [previewEnded, setPreviewEnded] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    // Intersection Observer: 섹션이 뷰포트에 들어오면 비디오 재생 시작
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold: 0.3 } // 30% 이상 보이면 시작
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // 비로그인 사용자 45초 제한 타이머 (일시정지와 관계없이 진행)
    useEffect(() => {
        if (user || !isInView || previewEnded) return;

        const timer = setTimeout(() => {
            setPreviewEnded(true);
            setIsLoginModalOpen(true);
        }, 45000); // 45초

        return () => clearTimeout(timer);
    }, [user, isInView, previewEnded]);

    // Use exported extractVimeoId from lib/api


    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const { data } = await getDailyFreeSparring();

                const vimeoFullId = extractVimeoId(data?.videoUrl);
                if (data && vimeoFullId) {
                    setVideo(data);
                }
            } catch (error) {
                console.error('Failed to load sparring video', error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideo();
    }, []);

    const vimeoIdToSend = video ? extractVimeoId(video.videoUrl) : null;

    // 로딩 중 - 스켈레톤 표시로 CLS 방지
    if (loading) {
        return (
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="h-8 w-48 bg-zinc-800/50 rounded-full mb-8 animate-pulse" />
                            <div className="h-12 w-full max-w-md bg-zinc-800/50 rounded-lg mb-4 animate-pulse" />
                            <div className="h-12 w-3/4 max-w-sm bg-zinc-800/50 rounded-lg mb-6 animate-pulse" />
                            <div className="h-20 w-full max-w-xl bg-zinc-800/30 rounded-lg animate-pulse" />
                        </div>
                        <div className="flex-1 w-full max-w-2xl">
                            <div className="aspect-square rounded-2xl bg-zinc-800/50 animate-pulse" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // 데이터 없음 - 섹션 숨김 (의도된 동작)
    if (!video || !vimeoIdToSend) {
        return null;
    }

    return (
        <section ref={sectionRef} className="py-24 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Text Section (Left) */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-8">
                            <Activity className="w-3.5 h-3.5 text-violet-500 mr-2" />
                            <span className="text-violet-400 text-[10px] font-bold tracking-[0.2em] uppercase">
                                Real-Time Application
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-zinc-50">
                            {title ? <HighlightedText text={title} /> : <>이론이 본능이 되는 <br /> 찰나를 목격하십시오.</>}
                        </h2>

                        <p className="text-zinc-400 text-lg mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {subtitle ? <HighlightedText text={subtitle} /> : <>레전드의 유산은 매트 위에서 완성됩니다. 편집 없는 생생한 실전 영상을 통해 지도자와 동기화 하십시오. <br className="hidden md:block" /> 당신은 이제 대한민국 최고들의 판단력을 갖게 됩니다.</>}
                        </p>

                        <div className="hidden lg:flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button
                                className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg shadow-[0_0_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2 group"
                                onClick={() => navigate(`/library?tab=sparring&id=${video.id}&view=reels`)}
                            >
                                <Play className="w-5 h-5 fill-white" />
                                <span>풀 스파링 보기</span>
                            </button>

                            <button
                                className="px-8 py-4 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={() => navigate('/library?tab=sparring')}
                            >
                                <span>스파링 전체보기</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Video Section (Right) */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div
                            className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-zinc-800"
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            <VideoPlayer
                                vimeoId={vimeoIdToSend}
                                title={video.title}
                                isPreviewMode={!user}
                                maxPreviewDuration={!user ? 45 : undefined}
                                onProgress={(seconds) => {
                                    if (!user && !previewEnded && seconds >= 45) {
                                        setPreviewEnded(true);
                                        setIsLoginModalOpen(true);
                                    }
                                }}
                                onPreviewLimitReached={() => {
                                    if (!previewEnded) {
                                        setPreviewEnded(true);
                                        if (!user) {
                                            setIsLoginModalOpen(true);
                                        }
                                    }
                                }}
                                showControls={false}
                                fillContainer={true}
                                playing={isInView && !isPaused && !previewEnded}
                                autoplay={isInView}
                                isPaused={isPaused || previewEnded}
                                forceSquareRatio={true}
                                muted={true}
                                hideInternalOverlay={true}
                            />

                            {/* Preview Ended Overlay */}
                            {previewEnded && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                    <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center mb-4">
                                        <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                                    </div>
                                    <p className="text-white text-sm font-bold text-center leading-tight">
                                        로그인 후<br />전체 영상 보기
                                    </p>
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90 transition-opacity ${previewEnded ? 'opacity-0' : ''}`}></div>

                            {/* Text Overlay */}
                            <div className={`absolute bottom-6 left-6 right-6 transition-opacity ${previewEnded ? 'opacity-0' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-zinc-400 text-xs font-bold tracking-wider uppercase">Live Sparring</span>
                                </div>
                                <p className="text-zinc-100 font-medium text-xl">{video.title}</p>
                            </div>

                        </div>

                        {/* Mobile Buttons (Shown below video on mobile) */}
                        <div className="flex lg:hidden flex-col sm:flex-row gap-4 mt-8 w-full">
                            <button
                                className="flex-1 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg shadow-[0_0_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2 group"
                                onClick={() => navigate(`/library?tab=sparring&id=${video.id}&view=reels`)}
                            >
                                <Play className="w-5 h-5 fill-white" />
                                <span>풀 스파링 보기</span>
                            </button>

                            <button
                                className="flex-1 px-8 py-4 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={() => navigate('/library?tab=sparring')}
                            >
                                <span>스파링 전체보기</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl="/library?tab=sparring"
            />
        </section>
    );
}
