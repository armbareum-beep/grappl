import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDrills } from '../lib/api';
import { Drill } from '../types';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { Grid, PlaySquare } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const Drills: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [routines, setRoutines] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'drills' | 'routines'>('drills');
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>('grid'); // Default to grid for search
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

    useEffect(() => {
        // If there's a search param, switch to grid view and drills tab
        const search = searchParams.get('search');
        if (search) {
            setSearchQuery(search);
            setActiveTab('drills');
            setViewMode('grid');
        }
        loadContent();
    }, [activeTab, searchParams]);

    const loadContent = async () => {
        setLoading(true);
        if (activeTab === 'drills') {
            const { data } = await getDrills();

            // Use mock data if database is empty (for testing)
            if (!data || data.length === 0) {
                const mockDrills: Drill[] = [
                    {
                        id: 'mock-1',
                        title: 'Triangle Choke from Closed Guard',
                        description: 'Learn the fundamental triangle choke setup from closed guard',
                        creatorId: 'mock-creator',
                        creatorName: 'John Danaher',
                        category: 'Guard' as any,
                        difficulty: 'Intermediate' as any,
                        thumbnailUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400',
                        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                        aspectRatio: '9:16',
                        duration: '0:45',
                        length: '0:45',
                        tags: ['triangle', 'choke', 'guard'],
                        likes: 1234,
                        price: 0,
                        views: 5678,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'mock-2',
                        title: 'Armbar from Mount',
                        description: 'Classic armbar finish from mount position',
                        creatorId: 'mock-creator',
                        creatorName: 'Gordon Ryan',
                        category: 'Mount' as any,
                        difficulty: 'Beginner' as any,
                        thumbnailUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400',
                        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                        aspectRatio: '9:16',
                        duration: '0:38',
                        length: '0:38',
                        tags: ['armbar', 'mount', 'submission'],
                        likes: 2345,
                        price: 0,
                        views: 8901,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'mock-3',
                        title: 'Berimbolo Entry',
                        description: 'Modern berimbolo technique for taking the back',
                        creatorId: 'mock-creator',
                        creatorName: 'Mikey Musumeci',
                        category: 'Guard' as any,
                        difficulty: 'Advanced' as any,
                        thumbnailUrl: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400',
                        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                        aspectRatio: '9:16',
                        duration: '1:02',
                        length: '1:02',
                        tags: ['berimbolo', 'back', 'advanced'],
                        likes: 3456,
                        price: 0,
                        views: 12345,
                        createdAt: new Date().toISOString()
                    }
                ];
                setDrills(mockDrills);
            } else {
                setDrills(data);
            }
        } else {
            const { getDrillRoutines } = await import('../lib/api');
            const { data } = await getDrillRoutines();
            if (data) setRoutines(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white">로딩 중...</p>
                </div>
            </div>
        );
    }

    // Reels mode - fullscreen immersive (Drills only)
    if (viewMode === 'reels' && activeTab === 'drills') {
        return <DrillReelsFeed drills={drills} onChangeView={() => setViewMode('grid')} />;
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">라이브러리</h1>
                        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                            <button
                                onClick={() => setActiveTab('drills')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'drills' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                드릴
                            </button>
                            <button
                                onClick={() => setActiveTab('routines')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'routines' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                루틴
                            </button>
                        </div>
                    </div>

                    {activeTab === 'drills' && (
                        <button
                            onClick={() => setViewMode('reels')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25"
                        >
                            <PlaySquare className="w-4 h-4" />
                            <span className="text-sm font-medium">릴스 뷰</span>
                        </button>
                    )}
                </div>

                {activeTab === 'drills' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {drills.map(drill => (
                            <div
                                key={drill.id}
                                className="aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 relative group"
                                onClick={async () => {
                                    // Find the routine that contains this drill
                                    const { getRoutineByDrillId } = await import('../lib/api');
                                    const { data: routine } = await getRoutineByDrillId(drill.id);

                                    if (routine) {
                                        window.location.href = `/routines/${routine.id}`;
                                    } else {
                                        // Fallback: if no routine found, show alert
                                        alert('이 드릴은 아직 루틴에 포함되지 않았습니다.');
                                    }
                                }}
                            >
                                <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                    <h3 className="text-white font-bold text-sm line-clamp-2">{drill.title}</h3>
                                    <p className="text-slate-400 text-xs mt-1">{drill.creatorName}</p>
                                    <p className="text-blue-400 text-xs mt-2 font-medium">루틴에서 보기 →</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {routines.map(routine => (
                            <div
                                key={routine.id}
                                onClick={() => window.location.href = `/routines/${routine.id}`}
                                className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
                            >
                                <div className="aspect-video relative">
                                    <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-medium flex items-center gap-1">
                                        <Grid className="w-3 h-3" />
                                        {routine.drillCount} 드릴
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{routine.title}</h3>
                                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">{routine.description}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                                <img src={`https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`} alt={routine.creatorName} />
                                            </div>
                                            <span className="text-xs text-slate-300">{routine.creatorName}</span>
                                        </div>
                                        <span className="text-blue-400 font-bold text-sm">
                                            {routine.price === 0 ? '무료' : `₩${routine.price.toLocaleString()}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
