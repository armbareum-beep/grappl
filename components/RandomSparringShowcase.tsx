import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Activity } from 'lucide-react';
import { getDailyFreeSparring, extractVimeoId } from '../lib/api';
import { SparringVideo } from '../types';
import { VideoPlayer } from './VideoPlayer';

export function RandomSparringShowcase() {
    const navigate = useNavigate();
    const [video, setVideo] = useState<SparringVideo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

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

    if (loading) return <div className="text-white p-4">DEBUG: Loading sparring...</div>;

    if (!video || !vimeoIdToSend) {
        return null; // Silent hide if no data
    }

    return (
        <section className="py-24 relative overflow-hidden">
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
                            이론이 실전이 되는 <br />
                            순간을 확인하세요.
                        </h2>

                        <p className="text-zinc-400 text-lg mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            블랙벨트의 기술은 스파링에서 완성됩니다. <br className="hidden md:block" />
                            컷 편집 없는 생생한 스파링 영상으로 기술의 타이밍과 흐름을 직접 체득하세요.
                        </p>

                        <div className="hidden lg:flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button
                                className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg shadow-[0_0_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2 group"
                                onClick={() => navigate(`/watch?tab=sparring&id=${video.id}`)}
                            >
                                <Play className="w-5 h-5 fill-white" />
                                <span>풀 스파링 보기</span>
                            </button>

                            <button
                                className="px-8 py-4 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={() => navigate('/library?tab=sparring')}
                            >
                                <span>더 많은 스파링</span>
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
                                isPreviewMode={true}
                                maxPreviewDuration={60}
                                showControls={false}
                                fillContainer={true}
                                playing={!isPaused}
                                autoplay={true}
                                isPaused={isPaused}
                                forceSquareRatio={true}
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90"></div>

                            {/* Text Overlay */}
                            <div className="absolute bottom-6 left-6 right-6">
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
                                onClick={() => navigate(`/watch?tab=sparring&id=${video.id}`)}
                            >
                                <Play className="w-5 h-5 fill-white" />
                                <span>풀 스파링 보기</span>
                            </button>

                            <button
                                className="flex-1 px-8 py-4 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={() => navigate('/library?tab=sparring')}
                            >
                                <span>더 많은 스파링</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
