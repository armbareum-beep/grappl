
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, ChevronRight, VolumeX } from 'lucide-react';
import { getPublicSparringVideos } from '../lib/api';
import { SparringVideo } from '../types';

export function RandomSparringShowcase() {
    const navigate = useNavigate();
    const [video, setVideo] = useState<SparringVideo | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to extract Vimeo ID
    const getVimeoId = (url: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url; // Already an ID
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };


    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const videos = await getPublicSparringVideos();

                // Filter out videos with invalid or error URLs
                const validVideos = videos.filter(v => getVimeoId(v.videoUrl));

                if (validVideos.length > 0) {
                    // Random selection from valid videos only
                    const randomVideo = validVideos[Math.floor(Math.random() * validVideos.length)];
                    setVideo(randomVideo);
                }
            } catch (error) {
                console.error('Failed to load sparring video', error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideo();
    }, []);

    if (loading) return null;
    if (!video) return null;

    const vimeoId = getVimeoId(video.videoUrl);
    if (!vimeoId) return null;
    if (!vimeoId) return null;

    return (
        <section className="py-20 bg-slate-950 relative overflow-hidden border-t border-slate-900">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Text Section */}
                    <div className="flex-1 text-center lg:text-left order-1 lg:order-2">
                        <div className="inline-block px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full mb-6">
                            <span className="text-indigo-400 text-sm font-bold uppercase tracking-wider">
                                Real Combat Experience
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                            매트 위에서 <br className="hidden md:block" />
                            <span className="text-white">증명합니다</span>
                        </h2>

                        <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            세계적인 인스트럭터들의 실제 스파링 영상을 확인하세요.<br />
                            기술이 실전에서 어떻게 통하는지 직접 볼 수 있습니다.
                        </p>

                        <div className="hidden lg:flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button
                                className="group bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                onClick={() => navigate(`/sparring?id=${video.id}`)}
                            >
                                <PlayCircle className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                                <span>이 스파링 전체 보기</span>
                            </button>

                            <button
                                className="px-8 py-4 rounded-xl font-bold text-lg text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
                                onClick={() => navigate('/sparring')}
                            >
                                <span>더 많은 스파링</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Video Section */}
                    <div className="flex-1 w-full max-w-2xl order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-slate-800 bg-slate-900 aspect-video group">
                            <iframe
                                src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&byline=0&title=0&portrait=0&badge=0&muted=1`}
                                className="absolute inset-0 w-full h-full transform scale-105"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                title={video.title}
                            ></iframe>

                            {/* Overlay Info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 pointer-events-none"></div>

                            {/* Title Overlay */}
                            <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                                <p className="text-white font-bold text-lg text-left">{video.title}</p>
                            </div>

                            {/* Unmute Hint */}
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <VolumeX className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -z-10 -bottom-6 -right-6 w-32 h-32 bg-stripe-pattern opacity-10"></div>
                    </div>

                    {/* Mobile Buttons Section (Order 3) */}
                    <div className="w-full flex lg:hidden flex-col sm:flex-row gap-4 justify-center order-3">
                        <button
                            className="group bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            onClick={() => navigate(`/sparring?id=${video.id}`)}
                        >
                            <PlayCircle className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span>이 스파링 전체 보기</span>
                        </button>

                        <button
                            className="px-8 py-4 rounded-xl font-bold text-lg text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            onClick={() => navigate('/sparring')}
                        >
                            <span>더 많은 스파링</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            </div>
        </section>
    );
}
