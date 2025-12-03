import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';

interface CombatPowerRadarProps {
    stats: {
        standing_power: number;
        guard_power: number;
        guard_pass_power: number;
        side_power: number;
        mount_power: number;
        back_power: number;
    } | null;
}

export const CombatPowerRadar: React.FC<CombatPowerRadarProps> = ({ stats }) => {
    // Calculate power for each category (0-100)
    const categories = ['Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back'];

    const data = categories.map(category => {
        let power = 0;
        if (stats) {
            switch (category) {
                case 'Standing': power = stats.standing_power || 0; break;
                case 'Guard': power = stats.guard_power || 0; break;
                case 'Guard Pass': power = stats.guard_pass_power || 0; break;
                case 'Side': power = stats.side_power || 0; break;
                case 'Mount': power = stats.mount_power || 0; break;
                case 'Back': power = stats.back_power || 0; break;
            }
        }

        return {
            category,
            power,
            fullMark: 100
        };
    });

    const totalPower = data.reduce((sum, item) => sum + item.power, 0);
    const averagePower = Math.round(totalPower / 6);

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Radar Chart */}
                <div className="w-full lg:w-2/3">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">⚔️</span>
                        전투력 분석
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <RadarChart data={data}>
                            <PolarGrid stroke="#475569" />
                            <PolarAngleAxis
                                dataKey="category"
                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                            />
                            <Radar
                                name="전투력"
                                dataKey="power"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.6}
                                strokeWidth={2}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats Panel */}
                <div className="w-full lg:w-1/3 space-y-4">
                    {/* Total Combat Power */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl border border-indigo-700/50 p-6 text-center">
                        <div className="text-sm text-indigo-300 mb-2 font-bold uppercase tracking-wider">Total Combat Power</div>
                        <div className="text-5xl font-black text-white mb-1">{totalPower}</div>
                        <div className="text-xs text-slate-400">/ 600</div>
                        <div className="mt-4 w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(totalPower / 600) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="space-y-2">
                        {data.map((item, index) => {
                            const colors = [
                                'from-indigo-500 to-blue-500',
                                'from-blue-500 to-cyan-500',
                                'from-purple-500 to-pink-500',
                                'from-green-500 to-emerald-500',
                                'from-orange-500 to-red-500',
                                'from-red-500 to-rose-500'
                            ];

                            return (
                                <div key={item.category} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-300">{item.category}</span>
                                        <span className="text-sm font-black text-white">{item.power}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div
                                            className={`bg-gradient-to-r ${colors[index]} h-1.5 rounded-full transition-all duration-500`}
                                            style={{ width: `${item.power}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
