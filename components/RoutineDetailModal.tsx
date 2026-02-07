import { X, Clock, Check, Lock, PlayCircle } from 'lucide-react';
import { DrillRoutine } from '../types';

interface RoutineDetailModalProps {
    routine: DrillRoutine;
    onClose: () => void;
    onPurchase: (routine: DrillRoutine) => void;
    isOwned: boolean;
    loading?: boolean;
}

import { motion, AnimatePresence } from 'framer-motion';

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({
    routine,
    onClose,
    onPurchase,
    isOwned,
    loading = false
}) => {
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50 flex flex-col md:flex-row ring-1 ring-white/10"
                >
                    {/* Left: Image & Key Info */}
                    <div className="md:w-5/12 relative group h-64 md:h-auto overflow-hidden">
                        <img
                            src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                            alt={routine.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent md:bg-gradient-to-r" />

                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 mb-4"
                            >
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-900/80 backdrop-blur-md border border-white/10 ${routine.difficulty === 'Beginner' ? 'text-emerald-400 border-emerald-500/30' :
                                    routine.difficulty === 'Intermediate' ? 'text-blue-400 border-blue-500/30' :
                                        'text-rose-400 border-rose-500/30'
                                    }`}>
                                    {routine.difficulty === 'Beginner' ? 'Beginner' :
                                        routine.difficulty === 'Intermediate' ? 'Intermediate' : 'Advanced'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                    {routine.category || 'Curriculum'}
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl font-black mb-6 leading-[1.1] tracking-tighter"
                            >
                                {routine.title}
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-6 text-sm font-black italic text-zinc-300"
                            >
                                <div className="flex items-center gap-2">
                                    <PlayCircle className="w-5 h-5 text-violet-400" />
                                    <span>{(routine.views || 0).toLocaleString()} 조회수</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-violet-400" />
                                    <span>{routine.totalDurationMinutes || 0} MINS</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right: Details & Action */}
                    <div className="flex-1 flex flex-col h-full bg-zinc-900">
                        <div className="flex justify-end p-6 absolute top-0 right-0 z-20">
                            <button
                                onClick={onClose}
                                aria-label="루틴 상세 닫기"
                                className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-10 pb-10 pt-16 custom-scrollbar">
                            <div className="mb-10">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">About this routine</p>
                                <p className="text-zinc-400 leading-relaxed font-medium">
                                    {routine.description || 'No description available for this training routine.'}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between tracking-tight">
                                    <span>Curriculum</span>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{routine.drills?.length || 0} units</span>
                                </h3>

                                <div className="space-y-4">
                                    {routine.drills?.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                            className={`flex items-center gap-5 p-5 rounded-2xl border transition-all ${isOwned
                                                ? 'bg-zinc-800/50 border-zinc-700/50 hover:border-violet-500/30 cursor-pointer group'
                                                : 'bg-zinc-950/30 border-zinc-800 opacity-60'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black italic ${isOwned ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'bg-zinc-800 text-zinc-600'
                                                }`}>
                                                {index + 1}
                                            </div>

                                            <div className="flex-1">
                                                <h4 className={`font-black tracking-tight ${isOwned ? 'text-white' : 'text-zinc-500'}`}>
                                                    {item.title}
                                                </h4>
                                                <div className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                                                    <span>{item.durationMinutes}m</span>
                                                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                                    <span className={
                                                        item.difficulty === 'Beginner' ? 'text-emerald-500/70' :
                                                            item.difficulty === 'Intermediate' ? 'text-blue-500/70' :
                                                                'text-rose-500/70'
                                                    }>{item.difficulty}</span>
                                                </div>
                                            </div>

                                            {isOwned ? (
                                                <PlayCircle className="w-6 h-6 text-violet-400 transition-transform group-hover:scale-110" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-zinc-700" />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-zinc-950 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Lifetime access</div>
                                    <div className="text-4xl font-black text-white tracking-tighter">
                                        ₩{(routine.price).toLocaleString()}
                                    </div>
                                </div>
                                {isOwned && (
                                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-400/20">
                                        <Check className="w-4 h-4" />
                                        Owned
                                    </div>
                                )}
                            </div>

                            {!isOwned && (
                                <button
                                    onClick={() => onPurchase(routine)}
                                    disabled={loading}
                                    className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-lg rounded-[1.5rem] transition-all shadow-xl shadow-violet-900/30 hover:shadow-violet-600/40 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Unlock This Routine'}
                                </button>
                            )}

                            {isOwned && (
                                <button
                                    onClick={() => { }}
                                    className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-lg rounded-[1.5rem] transition-all active:scale-95"
                                >
                                    Start Training Now
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
