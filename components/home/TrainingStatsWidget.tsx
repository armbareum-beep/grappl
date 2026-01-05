import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, Clock, Target, Video, Swords } from 'lucide-react';
import { TrainingLog } from '../../types';

interface TrainingStatsWidgetProps {
    logs: TrainingLog[];
}

interface Stats {
    totalMinutes: number;
    trainingSessions: number;
    techniquesCount: number;
    sparringRounds: number;
}

export const TrainingStatsWidget: React.FC<TrainingStatsWidgetProps> = ({ logs }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({
        totalMinutes: 0,
        trainingSessions: 0,
        techniquesCount: 0,
        sparringRounds: 0
    });

    useEffect(() => {
        // Calculate stats from last 30 days - REAL TRAINING DATA ONLY
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Filter: Only actual training logs (exclude online content viewing)
        // - Exclude durationMinutes === -1 (invalid logs)
        // - Exclude location starting with '__FEED__' (social feed posts)
        // - Exclude type === 'routine' or 'mastery' (online content)
        const validLogs = logs.filter(log =>
            new Date(log.date) >= thirtyDaysAgo &&
            log.durationMinutes !== -1 &&
            (!log.location || !log.location.startsWith('__FEED__')) &&
            !['routine', 'mastery', 'lesson'].includes((log as any).type)
        );

        const calculated: Stats = {
            // Total training time in minutes
            totalMinutes: validLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0),
            // Count of training sessions
            trainingSessions: validLogs.length,
            // Count of sessions with techniques practiced
            techniquesCount: validLogs.filter(log => log.techniques && log.techniques.length > 0).length,
            // Total sparring rounds
            sparringRounds: validLogs.reduce((sum, log) => sum + (log.sparringRounds || 0), 0)
        };

        setStats(calculated);
    }, [logs]);

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}분`;
        return `${hours}시간 ${mins}분`;
    };

    return (
        <div
            onClick={() => navigate('/arena')}
            className="lg:col-span-5 relative overflow-hidden bg-zinc-900/30 border border-white/5 p-6 md:p-8 rounded-[32px] group flex flex-col h-full cursor-pointer transition-all duration-300 hover:bg-zinc-900/50 hover:border-violet-500/30"
        >
            {/* Background Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-0.5">Training Stats</div>
                            <h3 className="text-lg font-black text-white leading-none">최근 30일 활동</h3>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 space-y-4">
                    {/* Total Training Time */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-white/5 hover:border-violet-500/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">총 수련 시간</p>
                                <p className="text-xl font-black text-white">{formatTime(stats.totalMinutes)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Routines, Lessons, Sparring */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-950/40 rounded-xl p-3 text-center border border-white/5 hover:border-violet-500/20 transition-colors">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Target className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="text-2xl font-black text-white mb-1">{stats.trainingSessions}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">수련</div>
                        </div>

                        <div className="bg-zinc-950/40 rounded-xl p-3 text-center border border-white/5 hover:border-violet-500/20 transition-colors">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Video className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="text-2xl font-black text-white mb-1">{stats.techniquesCount}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">기술</div>
                        </div>

                        <div className="bg-zinc-950/40 rounded-xl p-3 text-center border border-white/5 hover:border-violet-500/20 transition-colors">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Swords className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="text-2xl font-black text-white mb-1">{stats.sparringRounds}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">스파링</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                {stats.totalMinutes === 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-zinc-500 text-center">
                            아직 수련 기록이 없습니다. 첫 번째 수련을 시작해보세요!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
