import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getDrills } from '../lib/api';
import { Drill } from '../types';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { PlaySquare } from 'lucide-react';

export const Drills: React.FC = () => {
    const { user } = useAuth();
    const { error: toastError } = useToast();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');

    useEffect(() => {
        loadDrills();
    }, []);

    const loadDrills = async () => {
        setLoading(true);
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

    // Reels mode - fullscreen immersive
    if (viewMode === 'reels') {
        return <DrillReelsFeed drills={drills} onChangeView={() => setViewMode('grid')} />;
    }

    // Grid mode - clean drill display
    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">드릴</h1>
                    <button
                        onClick={() => setViewMode('reels')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25"
                    >
                        <PlaySquare className="w-4 h-4" />
                        <span className="text-sm font-medium">릴스 뷰</span>
                    </button>
                </div>

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
                                    toastError('이 드릴은 아직 루틴에 포함되지 않았습니다.');
                                }
                            }}
                        >
                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                <h3 className="text-white font-bold text-sm line-clamp-2">{drill.title}</h3>
                                <p className="text-slate-400 text-xs mt-1">{drill.creatorName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
