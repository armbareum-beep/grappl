import React, { useEffect, useState } from 'react';
import { Zap, Swords, Trophy, BookOpen, Layers, Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCompositeCombatPower, CombatPowerStats, getUserStreak } from '../../lib/api';

export const StatPowerPanel: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<CombatPowerStats | null>(null);
    const [streak, setStreak] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        try {
            const data = await getCompositeCombatPower(user.id);
            setStats(data);

            // Load streak
            const { data: streakData } = await getUserStreak(user.id);
            setStreak(streakData || 0);
        } catch (error) {
            console.error('Error loading combat power:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-8 animate-pulse flex justify-center items-center">
                <div className="text-slate-500">전투력 분석 중...</div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-500/10 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">

                {/* Left: Total Power Display (Hexagon) */}
                <div className="flex-shrink-0 relative">
                    <div className="w-48 h-48 relative flex items-center justify-center">
                        {/* Hexagon Shape SVG */}
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            <path d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z" fill="none" stroke="url(#hexGradient)" strokeWidth="2" />
                            <path d="M50 5 L89 27.5 V72.5 L50 95 L11 72.5 V27.5 Z" fill="rgba(15, 23, 42, 0.8)" />
                            <defs>
                                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Power Value */}
                        <div className="text-center z-10">
                            <div className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-1">Total Power</div>
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-200 tabular-nums tracking-tighter drop-shadow-lg">
                                {stats.totalPower.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">CP-RANK-A</div>
                        </div>

                        {/* Rotating Ring */}
                        <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite] border-t-transparent border-l-transparent"></div>
                    </div>
                </div>

                {/* Right: Breakdown Stats */}
                <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatItem
                        icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
                        label="수련 일지"
                        value={stats.breakdown.trainingLogs.count}
                        score={stats.breakdown.trainingLogs.score}
                        color="emerald"
                    />
                    <StatItem
                        icon={<Layers className="w-4 h-4 text-purple-400" />}
                        label="훈련 루틴"
                        value={stats.breakdown.routines.count}
                        score={stats.breakdown.routines.score}
                        color="purple"
                    />
                    <StatItem
                        icon={<Swords className="w-4 h-4 text-red-400" />}
                        label="스파링 복기"
                        value={stats.breakdown.sparringReviews.count}
                        score={stats.breakdown.sparringReviews.score}
                        color="red"
                    />
                    <StatItem
                        icon={<Zap className="w-4 h-4 text-yellow-400" />}
                        label="기술 스킬"
                        value={stats.breakdown.skills.count}
                        score={stats.breakdown.skills.score}
                        color="yellow"
                    />
                    <StatItem
                        icon={<Trophy className="w-4 h-4 text-blue-400" />}
                        label="벨트 승급"
                        value={stats.breakdown.belt.level}
                        score={stats.breakdown.belt.score}
                        color="blue"
                        isTextValue
                    />
                    <StatItem
                        icon={<Flame className="w-4 h-4 text-orange-400" />}
                        label="연속 수련일"
                        value={streak}
                        score={streak * 5}
                        color="orange"
                        suffix="일"
                    />
                </div>
            </div>
        </div>
    );
};

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    score: number;
    color: string;
    isTextValue?: boolean;
    suffix?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, score, color, isTextValue, suffix }) => {
    const colorClasses: Record<string, string> = {
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
        red: "bg-red-500/10 border-red-500/20 text-red-400",
        yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
        blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    };

    return (
        <div className={`flex flex-col p-3 rounded-lg border ${colorClasses[color]} transition-all hover:bg-opacity-20`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <div className={`font-bold ${isTextValue ? 'text-sm' : 'text-lg'} text-white`}>
                    {value}
                    {!isTextValue && !suffix && <span className="text-xs text-slate-500 font-normal ml-1">개</span>}
                    {suffix && <span className="text-xs text-slate-500 font-normal ml-1">{suffix}</span>}
                </div>
                <div className="text-xs font-mono opacity-70">
                    +{score.toLocaleString()}
                </div>
            </div>
        </div>
    );
};
