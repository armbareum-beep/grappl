import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
    getUserSavedLessons,
    getUserSavedRoutines,
    getUserRoutines,
    getSavedSparringVideos,
    getPurchasedSparringVideos
} from '../lib/api';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { CourseCard } from '../components/CourseCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { SparringCard } from '../components/SparringCard';
import { ChainCard } from './MyLibrary'; // Reusing ChainCard from MyLibrary if possible, or move it to components
import { useAuth } from '../contexts/AuthContext';

export const SavedListView: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getTitle = () => {
        switch (type) {
            case 'classes': return 'Classes & Lessons';
            case 'routines': return 'Training Routines';
            case 'sparring': return 'My Sparring';
            case 'roadmaps': return 'My Roadmap';
            default: return 'Saved Items';
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                let data: any[] = [];
                if (type === 'classes') {
                    const res = await getUserSavedLessons(user.id);
                    data = Array.isArray(res) ? res : ((res as any).data || []);
                } else if (type === 'routines') {
                    const savedRes = await getUserSavedRoutines(user.id);
                    const personalRes = await getUserRoutines(user.id);
                    const saved = Array.isArray(savedRes) ? savedRes : ((savedRes as any).data || []);
                    const personal = Array.isArray(personalRes) ? personalRes : ((personalRes as any).data || []);
                    data = [...personal, ...saved];
                } else if (type === 'sparring') {
                    const savedRes = await getSavedSparringVideos(user.id);
                    const purchasedRes = await getPurchasedSparringVideos(user.id);
                    const saved = Array.isArray(savedRes) ? savedRes : ((savedRes as any).data || []);
                    const purchased = Array.isArray(purchasedRes) ? purchasedRes : ((purchasedRes as any).data || []);

                    const purchasedIds = new Set(purchased.map((v: any) => v.id));
                    const savedIds = new Set(saved.map((v: any) => v.id));

                    data = Array.from(new Set([...savedIds, ...purchasedIds])).map(id => {
                        const item = saved.find((v: any) => v.id === id) || purchased.find((v: any) => v.id === id);
                        return {
                            ...item,
                            isPurchased: purchasedIds.has(id)
                        };
                    });
                } else if (type === 'roadmaps') {
                    const res = await listUserSkillTrees(user.id);
                    data = Array.isArray(res) ? res : ((res as any).data || []);
                }
                setItems(data);
            } catch (err) {
                console.error('Error fetching saved list:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, user]);

    if (loading) return <LoadingScreen />;
    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="min-h-screen bg-black pt-24 pb-12 px-4 md:px-12">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>돌아가기</span>
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{getTitle()}</h1>
                    <p className="text-zinc-500">{items.length}개의 항목</p>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                        <p className="text-zinc-500">저장된 항목이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {items.map((item) => {
                            const handleUnsave = () => {
                                if (item.isPurchased) return;
                                setItems(prev => prev.filter(i => i.id !== item.id));
                            };

                            if (type === 'classes') return <CourseCard key={item.id} course={item} onUnsave={handleUnsave} />;
                            if (type === 'routines') return <DrillRoutineCard key={item.id} routine={item} onUnsave={handleUnsave} />;
                            if (type === 'sparring') return <SparringCard key={item.id} video={item} onUnsave={handleUnsave} hasAccess={item.isPurchased} />;
                            if (type === 'roadmaps') return <ChainCard key={item.id} chain={item} />;
                            return null;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
