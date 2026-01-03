import React, { useState } from 'react';
import { Smile, Meh, Frown, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createTrainingLog } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export const QuickJournalWidget: React.FC = () => {
    const { user } = useAuth();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [note, setNote] = useState('');

    const moods = [
        { id: 'great', label: '최고였어요', icon: Smile, color: 'text-violet-400', bg: 'bg-violet-500/10', emoji: '🔥' },
        { id: 'good', label: '좋았어요', icon: Meh, color: 'text-indigo-400', bg: 'bg-indigo-500/10', emoji: '✨' },
        { id: 'hard', label: '힘들었어요', icon: Frown, color: 'text-zinc-400', bg: 'bg-zinc-500/10', emoji: '💪' },
    ];

    const handleMoodClick = (moodId: string) => {
        setSelectedMood(moodId);
        setIsModalOpen(true);
    };

    const handleQuickLog = async (moodId: string, customNote?: string, isShared: boolean = true) => {
        if (!user || loading) return;

        setLoading(true);

        const moodData = moods.find(m => m.id === moodId);
        const moodLabel = moodData?.label;
        const emoji = moodData?.emoji;

        try {
            const finalNote = customNote
                ? `${emoji} ${customNote}`
                : `[Quick Log] 오늘 스파링 기분: ${moodLabel}`;

            const { error: logError } = await createTrainingLog({
                userId: user.id,
                date: new Date().toISOString(),
                type: 'sparring',
                durationMinutes: 60,
                notes: finalNote,
                isPublic: isShared,
                metadata: { mood: moodId, source: 'quick_journal' },
                techniques: [],
                sparringRounds: 0
            });

            if (logError) throw logError;

            setShowSuccess(true);
            setIsModalOpen(false);
            setNote('');
            success(isShared ? '피드에 공유되었습니다!' : '기록이 저장되었습니다!');

            setTimeout(() => {
                setShowSuccess(false);
                setSelectedMood(null);
            }, 3000);

        } catch (e) {
            console.error('Quick log failed:', e);
            error('기록 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="px-4 md:px-12 max-w-7xl mx-auto mb-20">
            <div className="group relative overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border border-white/10 p-8 md:p-14 rounded-[48px] shadow-2xl">
                {/* Visual Accent - Mesh Gradients */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full group-hover:bg-violet-600/20 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full group-hover:bg-indigo-600/20 transition-colors duration-700" />

                {/* Content Container */}
                <div className="relative z-10 flex flex-col xl:flex-row items-center xl:items-start justify-between gap-12">
                    <div className="text-center xl:text-left max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20"
                        >
                            <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-violet-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Journaling</span>
                        </motion.div>

                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6 leading-[1.1]">
                            오늘 수련은 <br className="hidden md:block lg:hidden" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 animate-gradient-x">
                                어떠셨나요?
                            </span>
                        </h2>

                        <p className="text-zinc-400 text-base md:text-lg font-medium leading-relaxed mb-0">
                            단순한 감정 기록조차 당신의 성장에 밑거름이 됩니다.<br className="hidden md:block" />
                            지금 바로 기록을 남기고 XP와 성취를 공유하세요.
                        </p>
                    </div>

                    <div className="w-full xl:w-auto">
                        <div className="grid grid-cols-3 gap-3 md:gap-6">
                            <AnimatePresence mode="wait">
                                {showSuccess ? (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="col-span-3 flex flex-col items-center justify-center gap-4 py-10 text-violet-400 bg-violet-500/5 rounded-[40px] border border-violet-500/20"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                                            <Zap className="w-10 h-10 fill-current" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-black tracking-tight text-white mb-1">기록 성공!</div>
                                            <div className="text-violet-400 font-bold">+10 XP 획득</div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    moods.map((mood, idx) => {
                                        const Icon = mood.icon;
                                        const isSelected = selectedMood === mood.id;

                                        return (
                                            <motion.button
                                                key={mood.id}
                                                disabled={loading}
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                viewport={{ once: true }}
                                                onClick={() => handleMoodClick(mood.id)}
                                                className={`
                                                    group/btn relative flex flex-col items-center gap-4 p-5 md:p-10 rounded-[32px] md:rounded-[48px] transition-all duration-500
                                                    ${isSelected ? 'bg-white scale-95 shadow-2xl' : 'bg-white/5 hover:bg-white/10 hover:-translate-y-2'}
                                                    border border-white/5 min-w-[100px] md:min-w-[160px] flex-1
                                                `}
                                            >
                                                <div className={`
                                                    p-4 md:p-6 rounded-3xl md:rounded-[32px] transition-all duration-500
                                                    ${isSelected ? 'bg-zinc-100' : mood.bg} 
                                                    ${mood.color} group-hover/btn:scale-110 group-hover/btn:rotate-6
                                                `}>
                                                    <Icon className="w-8 h-8 md:w-12 md:h-12" />
                                                </div>
                                                <span className={`
                                                    text-xs md:text-lg font-black tracking-tight transition-colors duration-300
                                                    ${isSelected ? 'text-zinc-900' : 'text-zinc-500 group-hover/btn:text-white'}
                                                `}>
                                                    {mood.label}
                                                </span>

                                                {!isSelected && (
                                                    <div className="absolute inset-0 rounded-[32px] md:rounded-[48px] bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
                                                )}
                                            </motion.button>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Log Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-white/10 p-10 rounded-[48px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            {/* Decorative background for modal */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 blur-[60px] rounded-full pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex flex-col items-center text-center mb-8">
                                    <div className={`p-6 rounded-[32px] bg-violet-500/10 text-violet-400 mb-4 shadow-inner ring-1 ring-white/5`}>
                                        {selectedMood && React.createElement(moods.find(m => m.id === selectedMood)?.icon || Smile, { className: "w-10 h-10" })}
                                    </div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">수련이 어떠셨나요?</h3>
                                    <p className="text-zinc-500 font-medium">오늘의 기분을 한 줄로 표현해보세요.</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="간단한 메모 (선택사항)"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all font-medium"
                                            autoFocus
                                        />
                                        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => handleQuickLog(selectedMood!, note, true)}
                                        disabled={loading}
                                        className="w-full py-5 rounded-2xl bg-white text-black font-black hover:bg-zinc-100 active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 group"
                                    >
                                        <span>피드에 공유하기</span>
                                        <Zap className="w-4 h-4 fill-current text-violet-600 transition-transform group-hover:scale-125" />
                                    </button>
                                    <button
                                        onClick={() => handleQuickLog(selectedMood!, note, false)}
                                        disabled={loading}
                                        className="w-full py-5 rounded-2xl bg-zinc-800/50 text-zinc-400 font-bold hover:bg-zinc-800 hover:text-zinc-200 active:scale-95 transition-all text-sm border border-white/5"
                                    >
                                        나만 보기 (일지 기록)
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};
