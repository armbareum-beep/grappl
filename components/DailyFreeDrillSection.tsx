import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } from '../lib/api';
import { Drill, Lesson, SparringVideo } from '../types';
import { Clock } from 'lucide-react';
import { ContentBadge } from './common/ContentBadge';
import { HighlightedText } from './common/HighlightedText';
import { upgradeThumbnailQuality } from '../lib/utils';

interface DailyFreeDrillSectionProps {
    title?: string;
    subtitle?: string;
}

const CreatorAvatar: React.FC<{ src: string; name: string }> = ({ src, name }) => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-[10px] text-zinc-500 font-bold">
                {name?.charAt(0)}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
        />
    );
};

export const DailyFreeDrillSection: React.FC<DailyFreeDrillSectionProps> = ({ title, subtitle }) => {
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sparring, setSparring] = useState<SparringVideo | null>(null);
    const [activeId, setActiveId] = useState('lesson');
    const [timeLeft, setTimeLeft] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [drillRes, lessonRes, sparringRes] = await Promise.all([
                    getDailyFreeDrill(),
                    getDailyFreeLesson(),
                    getDailyFreeSparring()
                ]);
                if (drillRes.data) setDrill(drillRes.data);
                if (lessonRes.data) setLesson(lessonRes.data);
                if (sparringRes.data) setSparring(sparringRes.data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();

        const timer = setInterval(() => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            if (today !== currentDate) {
                setCurrentDate(today);
                fetchData();
            }

            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}h ${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [currentDate]);

    if (!drill || !lesson || !sparring) return null;

    // Define strict Aspect Ratios
    // activeRatio string will be directly used in the style prop
    const items = [
        {
            id: 'drill',
            type: 'DRILL',
            data: drill,
            img: drill.thumbnailUrl,
            activeRatio: '2/3', // Narrow & Tall
            link: `/watch?tab=drill&id=${drill.id}`
        },
        {
            id: 'lesson',
            type: 'LESSON',
            data: lesson,
            img: lesson.thumbnailUrl,
            activeRatio: '16/9', // Wide & Short
            link: `/watch?tab=lesson&id=${lesson.id}`
        },
        {
            id: 'sparring',
            type: 'SPARRING',
            data: sparring,
            img: sparring.thumbnailUrl,
            activeRatio: '1/1', // Square
            link: `/watch?tab=sparring&id=${sparring.id}`
        },
    ];

    return (
        <section className="py-24 md:py-40 relative bg-black text-white overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-violet-900/25 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-block mb-4">
                        <div className="bg-zinc-900/50 px-6 py-2 rounded-full inline-flex items-center gap-3 backdrop-blur-sm border border-zinc-800">
                            <Clock className="w-4 h-4 text-violet-500" />
                            <span className="text-zinc-400 font-mono text-sm tracking-wider">
                                Next Refresh in: <span className="text-zinc-200">{timeLeft}</span>
                            </span>
                        </div>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black text-zinc-50 mb-6 tracking-tight">
                        {title ? <HighlightedText text={title} highlightClass="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600" /> : <>TODAY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">FREE PASS</span></>}
                    </h2>

                    <p className="text-violet-300/80 text-xl font-medium max-w-2xl mx-auto break-keep">
                        {subtitle ? <HighlightedText text={subtitle} /> : '매일 프리미엄 콘텐츠가 무료로 공개됩니다.'}
                    </p>
                </div>

                {/* Accordion Layout */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full h-[500px] md:h-[500px]">
                    {items.map((item) => {
                        const isActive = activeId === item.id;

                        return (
                            <div
                                key={item.id}
                                onMouseEnter={() => setActiveId(item.id)}
                                onClick={() => {
                                    if (isActive) {
                                        navigate(item.link);
                                    } else {
                                        setActiveId(item.id);
                                    }
                                }}
                                style={{
                                    // STRICT ASPECT RATIO LOGIC:
                                    // If Active: flex-grow: 0, flex-shrink: 0, aspect-ratio defines size.
                                    // If Inactive: flex-grow: 1, shrink allowed, no fixed aspect ratio.
                                    flex: isActive ? '0 0 auto' : '1 1 0',
                                    aspectRatio: isActive ? item.activeRatio : 'auto',
                                } as React.CSSProperties}
                                className={`relative rounded-[32px] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer
                                    ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-80'}
                                    md:flex-row flex-col
                                    min-h-[100px] md:min-w-[100px]
                                    ${isActive ? 'contrast-100' : 'contrast-75'}
                                `}
                            >
                                {/* Aspect Ratio Preservation Strategy: Object-Cover + Alignment */}
                                <img
                                    src={upgradeThumbnailQuality(item.img)}
                                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${isActive ? 'scale-100' : 'scale-110'}
                                        ${item.id === 'drill' ? 'object-top' : 'object-center'}
                                    `}
                                    style={{ imageRendering: 'auto' }}
                                    alt={item.data.title}
                                />

                                <div className={`absolute inset-0 bg-black/20 transition-opacity ${isActive ? 'bg-black/30' : 'bg-black/60'}`} />

                                {/* Badges */}
                                {isActive && (
                                    <>
                                        <div className="absolute top-6 left-6 pointer-events-none">
                                            <ContentBadge type="daily_free" />
                                        </div>
                                        <div className="absolute top-6 right-6 pointer-events-none">
                                            {(item.data.views && item.data.views >= 100) ? (
                                                <ContentBadge type="popular" />
                                            ) : (item.data.createdAt && new Date(item.data.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                                                <ContentBadge type="recent" />
                                            ) : null}
                                        </div>
                                    </>
                                )}

                                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                    <div className={`transition-all duration-500 transform ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        <span className="text-violet-400 font-black tracking-widest text-sm mb-2 block">{item.type}</span>
                                        <h3 className={`font-bold leading-tight ${isActive ? 'mb-4 text-2xl md:text-3xl' : 'text-xl'}`}>
                                            {isActive ? item.data.title : ''}
                                        </h3>
                                        {isActive && (
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/10">
                                                    <CreatorAvatar
                                                        src={(item.data as any).creatorProfileImage || (item.data as any).creator?.profileImage || '/default-avatar.png'}
                                                        name={(item.data as any).creatorName || (item.data as any).creator?.name}
                                                    />
                                                </div>
                                                <span className="text-zinc-300 text-sm font-medium">
                                                    {(item.data as any).creatorName || (item.data as any).creator?.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Inactive Label (Rotated on Desktop, Horizontal on Mobile) */}
                                {!isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <h3 className="text-xl md:text-2xl font-black text-white/50 md:-rotate-90 whitespace-nowrap tracking-widest uppercase shadow-black drop-shadow-lg">
                                            {item.type}
                                        </h3>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section >
    );
};
