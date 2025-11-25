import React from 'react';
import { PlaySquare, Clock, ChevronRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TrainingRoutinesTab: React.FC = () => {
    // Mock data for saved routines/drills
    const savedItems = [
        {
            id: '1',
            type: 'drill',
            title: 'Triangle Choke Setup',
            instructor: 'John Danaher',
            duration: '0:45',
            thumbnail: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400',
            tags: ['Guard', 'Submission']
        },
        {
            id: '2',
            type: 'routine',
            title: 'Morning Mobility Flow',
            instructor: 'Gordon Ryan',
            duration: '15:00',
            thumbnail: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400',
            tags: ['Warmup', 'Mobility']
        }
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">나의 훈련 루틴</h2>
                    <p className="text-slate-400 text-sm">저장한 드릴과 루틴을 관리하세요</p>
                </div>
                <Link to="/drills">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Dumbbell className="w-4 h-4" />
                        새 루틴 찾기
                    </button>
                </Link>
            </div>

            {savedItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Dumbbell className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-white font-bold mb-2">저장된 루틴이 없습니다</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        드릴 탭에서 마음에 드는 루틴을 저장해보세요.
                    </p>
                    <Link to="/drills" className="text-blue-500 hover:text-blue-400 font-medium">
                        드릴 보러 가기 &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {savedItems.map((item) => (
                        <div key={item.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group cursor-pointer flex gap-4 items-center">
                            {/* Thumbnail */}
                            <div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <PlaySquare className="w-8 h-8 text-white opacity-80" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block ${item.type === 'routine' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'
                                            }`}>
                                            {item.type === 'routine' ? 'ROUTINE' : 'DRILL'}
                                        </span>
                                        <h3 className="text-white font-bold truncate pr-4">{item.title}</h3>
                                        <p className="text-slate-400 text-sm">{item.instructor}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.duration}
                                    </div>
                                    <div className="flex gap-2">
                                        {item.tags.map(tag => (
                                            <span key={tag}>#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
