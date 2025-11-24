import React, { useState, useEffect } from 'react';
import { getDrills, getDrillRoutines } from '../lib/api';
import { Drill, DrillRoutine } from '../types';
import { DrillCard } from '../components/DrillCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { Filter } from 'lucide-react';
import { VideoCategory, Difficulty } from '../types';

export const Drills: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'drills' | 'routines'>('drills');
    const [drills, setDrills] = useState<Drill[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
    const [maxPrice, setMaxPrice] = useState<number>(50000);
    const [priceFilter, setPriceFilter] = useState<number>(50000);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [drillsData, routinesData] = await Promise.all([
                getDrills(),
                getDrillRoutines(),
            ]);

            setDrills(drillsData);
            setRoutines(routinesData);

            // Set max price based on content
            const allPrices = [
                ...drillsData.map(d => d.price),
                ...routinesData.map(r => r.price),
            ];
            if (allPrices.length > 0) {
                const max = Math.max(...allPrices);
                setMaxPrice(max);
                setPriceFilter(max);
            }
        } catch (error) {
            console.error('Error fetching drills and routines:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter drills
    const filteredDrills = drills.filter((drill) => {
        const categoryMatch = selectedCategory === 'All' || drill.category === selectedCategory;
        const difficultyMatch = selectedDifficulty === 'All' || drill.difficulty === selectedDifficulty;
        const priceMatch = drill.price <= priceFilter;
        return categoryMatch && difficultyMatch && priceMatch;
    });

    // Filter routines
    const filteredRoutines = routines.filter((routine) => {
        const priceMatch = routine.price <= priceFilter;
        return priceMatch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">드릴 & 루틴</h1>
                <p className="text-slate-500 mt-1">짧고 강력한 훈련 드릴로 실력을 향상시키세요</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('drills')}
                    className={`pb-3 px-1 font-semibold transition-colors relative ${activeTab === 'drills'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    드릴
                    {activeTab === 'drills' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('routines')}
                    className={`pb-3 px-1 font-semibold transition-colors relative ${activeTab === 'routines'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    루틴
                    {activeTab === 'routines' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center text-slate-500 mr-2">
                    <Filter className="w-5 h-5 mr-2" />
                    <span className="font-semibold">필터:</span>
                </div>

                {activeTab === 'drills' && (
                    <>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="block w-full md:w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="All">모든 카테고리</option>
                            {Object.values(VideoCategory).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="block w-full md:w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="All">모든 난이도</option>
                            {Object.values(Difficulty).map((diff) => (
                                <option key={diff} value={diff}>
                                    {diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                                </option>
                            ))}
                        </select>
                    </>
                )}

                <div className="flex flex-col w-full md:w-64">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>최대 가격</span>
                        <span className="font-medium">₩{priceFilter.toLocaleString()}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        step="1000"
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0원</span>
                        <span>₩{maxPrice.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {activeTab === 'drills' ? (
                filteredDrills.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredDrills.map((drill) => (
                            <DrillCard key={drill.id} drill={drill} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        조건에 맞는 드릴이 없습니다.
                    </div>
                )
            ) : (
                filteredRoutines.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRoutines.map((routine) => (
                            <DrillRoutineCard key={routine.id} routine={routine} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        조건에 맞는 루틴이 없습니다.
                    </div>
                )
            )}
        </div>
    );
};
