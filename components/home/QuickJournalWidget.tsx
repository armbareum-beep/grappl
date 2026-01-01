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

    const moods = [
        { id: 'great', label: '최고였어요', icon: Smile, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { id: 'good', label: '좋았어요', icon: Meh, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { id: 'hard', label: '힘들었어요', icon: Frown, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    ];

    const handleQuickLog = async (moodId: string) => {
        if (!user || loading) return;

        setLoading(true);
        setSelectedMood(moodId);

        const moodLabel = moods.find(m => m.id === moodId)?.label;

        try {
            const { error: logError } = await createTrainingLog({
                userId: user.id,
                date: new Date().toISOString(),
                type: 'sparring',
                durationMinutes: 60,
                notes: `[Quick Log] 오늘 스파링 기분: ${moodLabel}`,
                isPublic: true,
                metadata: { mood: moodId, source: 'quick_journal' },
                techniques: [],
                sparringRounds: 0
            });

            if (logError) throw logError;

            setShowSuccess(true);
            success('스파링 기록이 저장되었습니다!');

            // Auto hide success after 3 seconds
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
        <section className="px-6 md:px-12 max-w-7xl mx-auto mb-16">
            <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 md:p-10 rounded-[40px] shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                            <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Live Journaling</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-3">
                            오늘 스파링은 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">어떠셨나요?</span>
                        </h2>
                        <p className="text-zinc-500 text-sm md:text-base font-medium max-w-md">복잡한 기록 대신, 지금의 기분을 바로 남겨보세요. <br />작은 기록이 모여 당신의 성장 그래프가 됩니다.</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                        <AnimatePresence mode="wait">
                            {showSuccess ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="flex flex-col items-center gap-3 py-4 text-violet-400"
                                >
                                    <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                        <Zap className="w-8 h-8 fill-current" />
                                    </div>
                                    <span className="font-bold tracking-tight">기록 완료! +10 XP</span>
                                </motion.div>
                            ) : (
                                moods.map((mood) => {
                                    const Icon = mood.icon;
                                    const isSelected = selectedMood === mood.id;

                                    return (
                                        <button
                                            key={mood.id}
                                            disabled={loading}
                                            onClick={() => handleQuickLog(mood.id)}
                                            className={`
                                                group relative flex flex-col items-center gap-3 p-5 md:p-7 rounded-[32px] transition-all duration-300
                                                ${isSelected ? 'bg-zinc-100 scale-95' : 'bg-white/5 hover:bg-white/10 hover:-translate-y-1'}
                                                border border-white/5 min-w-[100px] md:min-w-[120px]
                                            `}
                                        >
                                            <div className={`p-3 rounded-2xl ${mood.bg} ${mood.color} group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-6 h-6 md:w-8 md:h-8" />
                                            </div>
                                            <span className={`text-xs md:text-sm font-bold ${isSelected ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                {mood.label}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};
