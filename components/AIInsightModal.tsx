import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    const { course, routines = [], sparring = [] } = recommendations;

    const typeConfig = {
        strength: {
            label: 'STRENGTH',
            color: 'emerald',
            bgClass: 'bg-emerald-500/10',
            textClass: 'text-emerald-400',
            borderClass: 'border-emerald-500/30',
            glow: 'from-emerald-600/20 to-transparent'
        },
        weakness: {
            label: 'WEAKNESS',
            color: 'rose',
            bgClass: 'bg-rose-500/10',
            textClass: 'text-rose-400',
            borderClass: 'border-rose-500/30',
            glow: 'from-rose-600/20 to-transparent'
        },
        suggestion: {
            label: 'SUGGESTION',
            color: 'violet',
            bgClass: 'bg-violet-500/10',
            textClass: 'text-violet-400',
            borderClass: 'border-violet-500/30',
            glow: 'from-violet-600/20 to-transparent'
        }
    };

    const config = typeConfig[insight.type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col ring-1 ring-white/10"
                    >
                        {/* Ambient Glow */}
                        <div className={`absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br ${config.glow} blur-[100px] rounded-full pointer-events-none opacity-50`} />

                        {/* Header */}
                        <div className="relative z-10 p-8 md:p-10 border-b border-white/5">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center gap-2 mb-4"
                                    >
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${config.textClass.replace('text', 'bg')}`} />
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass} uppercase tracking-[0.2em]`}>
                                            {config.label}
                                        </span>
                                    </motion.div>
                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-[1.1] mb-4"
                                    >
                                        {insight.message}
                                    </motion.h2>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-zinc-400 font-medium leading-relaxed max-w-xl"
                                    >
                                        {insight.detail}
                                    </motion.p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="flex-shrink-0 w-12 h-12 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar">
                            {/* Recommended Course */}
                            {course && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">추천 코스</h3>
                                    </div>
                                    <motion.div
                                        whileHover={{ y: -5 }}
                                        onClick={() => {
                                            navigate(`/courses/${course.id}`);
                                            onClose();
                                        }}
                                        className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer bg-zinc-800 border-2 border-transparent hover:border-violet-500/30 transition-all shadow-2xl"
                                    >
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                                        <div className="absolute bottom-0 left-0 w-full p-8">
                                            <h4 className="text-xl font-black text-white leading-tight tracking-tight mb-2">{course.title}</h4>
                                            <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold">
                                                <span>{course.creatorName}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-6 right-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                            <Play className="w-6 h-6 text-white fill-current" />
                                        </div>
                                    </motion.div>
                                </section>
                            )}

                            {/* Recommended Routines */}
                            {routines.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">추천 루틴</h3>
                                    </div>
                                    <div className="grid gap-4">
                                        {routines.slice(0, 2).map((routine: any, idx: number) => (
                                            <motion.div
                                                key={routine.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 * idx }}
                                                onClick={() => {
                                                    navigate(`/routines/${routine.id}`);
                                                    onClose();
                                                }}
                                                className="group flex items-center gap-5 p-5 rounded-2xl bg-zinc-800/40 border border-zinc-700/30 hover:border-blue-500/30 hover:bg-zinc-800/60 transition-all cursor-pointer"
                                            >
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/5">
                                                    <img
                                                        src={routine.thumbnailUrl}
                                                        alt={routine.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-black text-zinc-100 group-hover:text-white transition-colors tracking-tight mb-2">
                                                        {routine.title}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {routine.totalDurationMinutes} MINS
                                                        </span>
                                                        <span className="text-blue-400/80">{routine.difficulty}</span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-blue-500/20 transition-all">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Recommended Sparring */}
                            {sparring.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                            <Play className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">추천 스파링 영상</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {sparring.slice(0, 4).map((video: any, idx: number) => (
                                            <motion.div
                                                key={video.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * idx }}
                                                onClick={() => {
                                                    navigate(`/sparring/${video.id}`);
                                                    onClose();
                                                }}
                                                className="group bg-zinc-800/40 border border-zinc-700/30 rounded-2xl p-4 flex items-center gap-4 hover:border-rose-500/30 transition-all cursor-pointer"
                                            >
                                                <div className="w-16 h-12 rounded-xl bg-zinc-800 overflow-hidden relative flex-shrink-0">
                                                    <img src={video.thumbnailUrl} alt={video.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-3 h-3 text-white fill-current" />
                                                    </div>
                                                </div>
                                                <h4 className="text-xs font-black text-zinc-300 group-hover:text-white transition-colors truncate">
                                                    {video.title}
                                                </h4>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 p-8 bg-zinc-950/50 border-t border-white/5 backdrop-blur-md">
                            <button
                                onClick={onClose}
                                className="w-full py-5 rounded-[1.5rem] bg-zinc-800 hover:bg-zinc-700 text-white font-black text-lg transition-all active:scale-95 shadow-xl shadow-black/20"
                            >
                                분석 창 닫기
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
