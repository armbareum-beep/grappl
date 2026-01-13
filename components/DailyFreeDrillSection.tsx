import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } from '../lib/api';
import { Drill, Lesson, SparringVideo } from '../types';
import { Clock } from 'lucide-react';

export const DailyFreeDrillSection: React.FC = () => {
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
            activeRatio: '4/5', // Narrow & Tall
            link: `/watch?tab=drill&id=${drill.id}`
        },
        {
            id: 'lesson',
            type: 'LESSON',
            data: lesson,
            img: lesson.thumbnailUrl,
            activeRatio: '5/4', // Wide & Short
            link: '/watch?tab=lesson'
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
                        TODAY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">FREE PASS</span>
                    </h2>

                    <p className="text-violet-300/80 text-xl font-medium max-w-2xl mx-auto break-keep">
                        매일 프리미엄 콘텐츠가 무료로 공개됩니다.
                    </p>
                </div>

                {/* Accordion Layout */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full h-[600px] md:h-[600px]">
                    {items.map((item) => {
                        const isActive = activeId === item.id;

                        return (
                            <div
                                key={item.id}
                                onMouseEnter={() => setActiveId(item.id)}
                                onClick={() => setActiveId(item.id)}
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
                                    src={item.img}
                                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${isActive ? 'scale-100' : 'scale-110'}
                                        ${item.id === 'drill' ? 'object-top' : 'object-center'}
                                    `}
                                    alt={item.data.title}
                                />

                                <div className={`absolute inset-0 bg-black/20 transition-opacity ${isActive ? 'bg-black/30' : 'bg-black/60'}`} />

                                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                                    <div className={`transition-all duration-500 transform ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        <span className="text-violet-400 font-black tracking-widest text-sm mb-2 block">{item.type}</span>
                                        <h3 className={`font-bold leading-tight mb-4 text-white ${isActive ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
                                            {isActive ? item.data.title : ''}
                                        </h3>
                                        {isActive && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(item.link);
                                                }}
                                                className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-violet-50 transition-colors shadow-xl shadow-black/20"
                                            >
                                                바로 시청하기
                                            </button>
                                        )}
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
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
