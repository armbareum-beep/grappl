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
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO, subDays, subMonths } from 'date-fns';
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
    range?: '1W' | '1M' | '3M' | '6M' | '1Y';
}

export const TrainingTrendsChart: React.FC<TrainingTrendsChartProps> = ({ items, metric, range }) => {
    const chartData = useMemo(() => {
        const today = new Date();
        let start, end;

        switch (range) {
            case '1W': start = subDays(today, 6); end = today; break;
            case '1M': start = subMonths(today, 1); end = today; break;
            case '3M': start = subMonths(today, 3); end = today; break;
            case '6M': start = subMonths(today, 6); end = today; break;
            case '1Y': start = subDays(today, 364); end = today; break;
            default: start = startOfMonth(today); end = endOfMonth(today);
        }

        const days = eachDayOfInterval({ start, end });
        const hasData = items.length > 0;

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

            // Add placeholder wave pattern for empty data
            if (!hasData) {
                const waveValue = Math.sin((days.indexOf(day)) * 0.3) * 0.5 + 1;
                count = waveValue;
                duration = waveValue * 60;
                rounds = Math.floor(waveValue * 2);
            }

            return {
                date: format(day, range === '1W' ? 'EEEE' : 'd일', { locale: ko }),
                fullDate: format(day, 'yyyy-MM-dd'),
                duration,
                rounds,
                count
            };
        });
    }, [items, range]);

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
            default:
                return {
                    dataKey: 'count',
                    color: '#6366f1',
                    name: '수련 횟수',
                    unit: '회'
                };
        }
    }, [metric]);

    const hasData = items.length > 0;

    return (
        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {config.name} 추이
                    </h3>
                    <p className="text-sm text-zinc-500">
                        {range === '1W' ? '최근 7일' : range === '1M' ? '최근 1개월' : range === '3M' ? '최근 3개월' : range === '6M' ? '최근 6개월' : range === '1Y' ? '최근 1년' : '이번 달'} {config.name} 변화 그래프
                    </p>
                </div>
            </div>

            <div className="h-[250px] w-full relative">
                {!hasData && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <p className="text-zinc-700 text-sm font-medium">데이터를 기록하면 여기에 표시됩니다</p>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                        <defs>
                            <linearGradient id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={hasData ? 0.3 : 0.1} />
                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#27272a" strokeDasharray="0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#52525b"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#52525b"
                            tick={false}
                            tickLine={false}
                            axisLine={false}
                            width={0}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid #27272a',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}
                            formatter={(value: number) => [`${value}${config.unit}`, config.name]}
                            cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area
                            type="monotone"
                            dataKey={config.dataKey}
                            stroke="#a78bfa"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${metric})`}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#a78bfa' }}
                            animationDuration={1000}
                            style={{
                                filter: hasData ? 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.4))' : 'none',
                                opacity: hasData ? 1 : 0.3
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
