import React, { useMemo } from 'react';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrainingLog, SparringReview } from '../../types';

interface TimelineItem {
    type: 'log' | 'sparring';
    data: TrainingLog | SparringReview;
}

export type TrainingMetric = 'count' | 'duration' | 'rounds';

interface TrainingTrendsChartProps {
    items: TimelineItem[];
    metric: TrainingMetric;
}

export const TrainingTrendsChart: React.FC<TrainingTrendsChartProps> = ({ items, metric }) => {
    const chartData = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dayItems = items.filter(item => isSameDay(parseISO(item.data.date), day));

            let duration = 0;
            let rounds = 0;
            let count = 0;

            // Calculate daily stats
            const logs = dayItems.filter(i => i.type === 'log');
            if (logs.length > 0) count += logs.length;

            // Note: For 'count' (Sessions), we primarily count logs.
            // If a day has only sparring reviews but no logs, we currently don't count it as a separate session
            // to align with "Training Log" count.
            // Adjust if "Total Sessions" should include sparring-only days.

            dayItems.forEach(item => {
                if (item.type === 'log') {
                    const log = item.data as TrainingLog;
                    duration += log.durationMinutes || 0;
                    rounds += log.sparringRounds || 0;
                } else if (item.type === 'sparring') {
                    const sparring = item.data as SparringReview;
                    rounds += sparring.rounds || 0;
                }
            });

            return {
                date: format(day, 'd일', { locale: ko }),
                fullDate: format(day, 'yyyy-MM-dd'),
                duration,
                rounds,
                count
            };
        });
    }, [items]);

    // Configuration based on metric
    const config = useMemo(() => {
        switch (metric) {
            case 'count':
                return {
                    dataKey: 'count',
                    color: '#6366f1', // Indigo
                    name: '수련 횟수',
                    unit: '회'
                };
            case 'duration':
                return {
                    dataKey: 'duration',
                    color: '#3b82f6', // Blue
                    name: '수련 시간',
                    unit: '분'
                };
            case 'rounds':
                return {
                    dataKey: 'rounds',
                    color: '#f97316', // Orange
                    name: '스파링',
                    unit: 'R'
                };
        }
    }, [metric]);

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {config.name} 추이
                    </h3>
                    <p className="text-sm text-slate-400">이번 달 {config.name} 변화 그래프</p>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                        <defs>
                            <linearGradient id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={false}
                            tickLine={false}
                            axisLine={false}
                            width={0}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}
                            formatter={(value: number) => [`${value}${config.unit}`, config.name]}
                        />
                        <Area
                            type="monotone"
                            dataKey={config.dataKey}
                            stroke={config.color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${metric})`}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
