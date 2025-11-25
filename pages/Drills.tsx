import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRoutines, getUserRoutines, purchaseRoutine } from '../lib/api';
import { VideoCategory, Difficulty, type DrillRoutine } from '../types';
import { DrillRoutineGrid } from '../components/DrillRoutineGrid';
import { RoutineDetailModal } from '../components/RoutineDetailModal';
import { Dumbbell, Search, Filter } from 'lucide-react';
import { Button } from '../components/Button';

export const Drills: React.FC = () => {
    const { user } = useAuth();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [purchasedRoutineIds, setPurchasedRoutineIds] = useState<string[]>([]);
    const [selectedRoutine, setSelectedRoutine] = useState<DrillRoutine | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // Filter states matching Browse.tsx
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const { data: allRoutines } = await getRoutines();
        if (allRoutines) {
            setRoutines(allRoutines);
        }

        if (user) {
            const { data: myRoutines } = await getUserRoutines(user.id);
            if (myRoutines) {
                setPurchasedRoutineIds(myRoutines.map(r => r.id));
            }
        }
        setLoading(false);
    };

    const handlePurchase = async (routine: DrillRoutine) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (confirm(`${routine.title}을(를) 구매하시겠습니까?`)) {
            setPurchaseLoading(true);
            const { error } = await purchaseRoutine(user.id, routine.id);

            if (error) {
                alert('구매 중 오류가 발생했습니다.');
            } else {
                alert('구매가 완료되었습니다!');
                setPurchasedRoutineIds([...purchasedRoutineIds, routine.id]);
                loadData();
            }
            setPurchaseLoading(false);
        }
    };

    const filteredRoutines = routines.filter(routine => {
        const categoryMatch = selectedCategory === 'All' || routine.category === selectedCategory;
        const difficultyMatch = selectedDifficulty === 'All' || routine.difficulty === selectedDifficulty;
        return categoryMatch && difficultyMatch;
    });

    const categories = ['All', ...Object.values(VideoCategory)];
    const difficulties = ['All', ...Object.values(Difficulty)];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar - Exact match to Browse.tsx */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden flex-shrink-0 fixed h-[calc(100vh-64px)] top-16 z-20 hidden md:block`}>
                <div className="p-4 space-y-6 overflow-y-auto h-full">
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3 px-2">카테고리</h3>
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat
                                        ? 'bg-slate-100 font-medium text-slate-900'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {cat === 'All' ? '전체' : cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="font-semibold text-slate-900 mb-3 px-2">난이도</h3>
                        <div className="space-y-1">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff}
                                    onClick={() => setSelectedDifficulty(diff)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedDifficulty === diff
                                        ? 'bg-slate-100 font-medium text-slate-900'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {diff === 'All' ? '전체' : diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : ''}`}>
                <div className="p-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                                <Dumbbell className="w-8 h-8 text-blue-600" />
                                드릴 & 루틴
                            </h1>
                            <p className="text-slate-600">
                                체계적인 드릴 루틴으로 실력을 향상시키세요.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="루틴 검색..."
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                                />
                            </div>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                <Filter className="w-4 h-4" />
                                {sidebarOpen ? '필터 숨기기' : '필터'}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Filter Tags (Categories only for simplicity on mobile, or match Browse) */}
                    <div className="md:hidden flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {cat === 'All' ? '전체' : cat}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-slate-500">루틴을 불러오는 중...</p>
                        </div>
                    ) : routines.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                            <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">등록된 루틴이 없습니다</h3>
                            <p className="text-slate-500">곧 새로운 루틴이 업데이트될 예정입니다.</p>
                        </div>
                    ) : filteredRoutines.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            조건에 맞는 루틴이 없습니다.
                        </div>
                    ) : (
                        <DrillRoutineGrid
                            routines={filteredRoutines}
                            onRoutineClick={setSelectedRoutine}
                            purchasedRoutineIds={purchasedRoutineIds}
                        />
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRoutine && (
                <RoutineDetailModal
                    routine={selectedRoutine}
                    onClose={() => setSelectedRoutine(null)}
                    onPurchase={handlePurchase}
                    isOwned={purchasedRoutineIds.includes(selectedRoutine.id)}
                    loading={purchaseLoading}
                />
            )}
        </div>
    );
};
