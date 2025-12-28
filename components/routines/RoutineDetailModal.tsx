import React from 'react';
import { X, Clock, BarChart, Check, Lock, PlayCircle } from 'lucide-react';
import { DrillRoutine } from '../../types';
import { Button } from '../Button';

interface RoutineDetailModalProps {
    routine: DrillRoutine;
    onClose: () => void;
    onPurchase: (routine: DrillRoutine) => void;
    isOwned: boolean;
    loading?: boolean;
}

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({
    routine,
    onClose,
    onPurchase,
    isOwned,
    loading = false
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">

                {/* Left: Image & Key Info */}
                <div className="md:w-2/5 relative">
                    <img
                        src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                        alt={routine.title}
                        className="w-full h-64 md:h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent md:bg-gradient-to-r" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors md:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${routine.difficulty === 'Beginner' ? 'bg-green-500' :
                                routine.difficulty === 'Intermediate' ? 'bg-blue-500' :
                                    'bg-purple-500'
                                }`}>
                                {routine.difficulty === 'Beginner' ? '초급' :
                                    routine.difficulty === 'Intermediate' ? '중급' : '상급'}
                            </span>
                            <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                {routine.category || 'General'}
                            </span>
                        </div>

                        <h2 className="text-3xl font-black mb-4 leading-tight">{routine.title}</h2>

                        <div className="flex items-center gap-6 text-sm font-medium text-white/90">
                            <div className="flex items-center gap-2">
                                <BarChart className="w-5 h-5 text-blue-400" />
                                <span>{routine.drillCount || 0}개 드릴</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-400" />
                                <span>{routine.totalDurationMinutes || 0}분</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Details & Action */}
                <div className="flex-1 flex flex-col h-full bg-white">
                    <div className="hidden md:flex justify-end p-6">
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pb-8 pt-6 md:pt-0">
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-3">루틴 소개</h3>
                            <p className="text-slate-600 leading-relaxed">
                                {routine.description || '이 루틴에 대한 설명이 없습니다.'}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
                                <span>포함된 드릴</span>
                                <span className="text-sm font-normal text-slate-500">{routine.items?.length || 0}개</span>
                            </h3>

                            <div className="space-y-3">
                                {routine.items?.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isOwned
                                            ? 'bg-blue-50 border-blue-100 hover:border-blue-200 cursor-pointer'
                                            : 'bg-slate-50 border-slate-100 opacity-75'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isOwned ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                            {index + 1}
                                        </div>

                                        <div className="flex-1">
                                            <h4 className={`font-medium ${isOwned ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {item.title}
                                            </h4>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {item.durationMinutes}분 • {item.difficulty}
                                            </div>
                                        </div>

                                        {isOwned ? (
                                            <PlayCircle className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">총 가격</div>
                                <div className="text-3xl font-black text-slate-900">
                                    ₩{(routine.price).toLocaleString()}
                                </div>
                            </div>
                            {isOwned && (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full font-bold">
                                    <Check className="w-5 h-5" />
                                    구매 완료
                                </div>
                            )}
                        </div>

                        {!isOwned && (
                            <Button
                                onClick={() => onPurchase(routine)}
                                disabled={loading}
                                className="w-full py-4 text-lg font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
                            >
                                {loading ? '처리 중...' : '루틴 구매하기'}
                            </Button>
                        )}

                        {isOwned && (
                            <Button
                                onClick={() => { }} // TODO: Navigate to first drill
                                className="w-full py-4 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
                            >
                                루틴 시작하기
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
