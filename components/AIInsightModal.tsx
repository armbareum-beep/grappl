import React from 'react';
import { X, ChevronRight, Play, Activity, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIInsightModalProps {
    isOpen: boolean;
    onClose: () => void;
    insight: {
        type: 'strength' | 'weakness' | 'suggestion';
        message: string;
        detail: string;
    };
    recommendations?: {
        course?: any;
        routines?: any[];
        sparring?: any[];
    };
}

export const AIInsightModal: React.FC<AIInsightModalProps> = ({
    isOpen,
    onClose,
    insight,
    recommendations = {}
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const { course, routines = [], sparring = [] } = recommendations;

    const typeConfig = {
        strength: {
            label: 'STRENGTH',
            color: 'emerald',
            bgClass: 'bg-emerald-500/10',
            textClass: 'text-emerald-400',
            borderClass: 'border-emerald-500/20',
            glowClass: 'shadow-emerald-500/20'
        },
        weakness: {
            label: 'WEAKNESS',
            color: 'rose',
            bgClass: 'bg-rose-500/10',
            textClass: 'text-rose-400',
            borderClass: 'border-rose-500/20',
            glowClass: 'shadow-rose-500/20'
        },
        suggestion: {
            label: 'SUGGESTION',
            color: 'violet',
            bgClass: 'bg-violet-500/10',
            textClass: 'text-violet-400',
            borderClass: 'border-violet-500/20',
            glowClass: 'shadow-violet-500/20'
        }
    };

    const config = typeConfig[insight.type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Glow Effects */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 bg-${config.color}-600/20 blur-[100px] rounded-full pointer-events-none`} />
                <div className={`absolute -bottom-20 -left-20 w-64 h-64 bg-${config.color}-600/10 blur-[100px] rounded-full pointer-events-none`} />

                {/* Header */}
                <div className="relative z-10 p-6 md:p-8 border-b border-white/5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass} uppercase tracking-widest`}>
                                    {config.label}
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                                {insight.message}
                            </h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {insight.detail}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-700/50 hover:border-zinc-600 transition-all"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 md:p-8 space-y-6">
                    {/* Recommended Course */}
                    {course && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-violet-400" />
                                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">추천 코스</h3>
                            </div>
                            <div
                                onClick={() => {
                                    navigate(`/courses/${course.id}`);
                                    onClose();
                                }}
                                className="group relative aspect-video rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 transition-all"
                            >
                                <img
                                    src={course.thumbnailUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
                                <div className="absolute bottom-0 left-0 w-full p-6">
                                    <h4 className="text-lg font-bold text-white leading-tight line-clamp-2 mb-1">{course.title}</h4>
                                    <p className="text-xs text-zinc-400">{course.creatorName}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recommended Routines */}
                    {routines.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-4 h-4 text-violet-400" />
                                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">추천 루틴</h3>
                            </div>
                            <div className="space-y-3">
                                {routines.slice(0, 2).map((routine) => (
                                    <div
                                        key={routine.id}
                                        onClick={() => {
                                            navigate(`/routines/${routine.id}`);
                                            onClose();
                                        }}
                                        className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-violet-500/30 hover:bg-zinc-950/60 transition-all cursor-pointer"
                                    >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
                                            {routine.thumbnailUrl && (
                                                <img
                                                    src={routine.thumbnailUrl}
                                                    alt={routine.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-violet-300 transition-colors line-clamp-1 mb-1">
                                                {routine.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {routine.totalDurationMinutes}분
                                                </span>
                                                <span>{routine.difficulty || 'Beginner'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommended Sparring Videos */}
                    {sparring.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Play className="w-4 h-4 text-violet-400" />
                                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">추천 스파링 영상</h3>
                            </div>
                            <div className="space-y-3">
                                {sparring.slice(0, 3).map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => {
                                            navigate(`/sparring/${video.id}`);
                                            onClose();
                                        }}
                                        className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-violet-500/30 hover:bg-zinc-950/60 transition-all cursor-pointer"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden relative flex-shrink-0">
                                            <img
                                                src={video.thumbnailUrl}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                <Play className="w-4 h-4 text-white fill-current" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                                                {video.title}
                                            </h4>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!course && routines.length === 0 && sparring.length === 0 && (
                        <div className="py-12 text-center">
                            <Sparkles className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm">
                                이 분석과 관련된 추천 콘텐츠가 아직 없습니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative z-10 p-6 md:p-8 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 font-bold hover:bg-zinc-700/50 hover:border-zinc-600 transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
