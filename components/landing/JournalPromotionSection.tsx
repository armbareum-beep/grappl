import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { LineChart as LineChartIcon } from 'lucide-react';

// Mock data for the line chart (simulating growth/XP)
const chartData = [
    { value: 20 },
    { value: 35 },
    { value: 30 },
    { value: 45 },
    { value: 55 },
    { value: 50 },
    { value: 70 },
    { value: 65 },
    { value: 85 },
    { value: 95 },
    { value: 90 },
    { value: 110 },
];

// Mock data for the contribution grid (52 weeks x 7 days)
// We'll generate random activity for visual effect
const generateGrassData = () => {
    const data = [];
    for (let i = 0; i < 364; i++) {
        // 30% chance of being active
        data.push(Math.random() > 0.7);
    }
    return data;
};

const grassData = generateGrassData();

export const JournalPromotionSection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 md:py-40 relative overflow-hidden border-t-0">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">

                    {/* 1. Text Content (Left) */}
                    <div className="w-full md:w-1/2 text-left z-20">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                            <LineChartIcon className="w-3.5 h-3.5 text-violet-500 mr-2" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400">
                                TRAINING JOURNAL
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight text-white tracking-tight">
                            당신의 땀방울은 <br />
                            배신하지 않습니다. <br />
                            <span className="text-violet-500">노력을 시각화하세요.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
                            훈련과 스파링 데이터를 빠짐없이 기록하고 보라색 잔디를 채워나가세요.
                            매일 쌓이는 기록이 당신을 더 단단한 그래플러로 만듭니다.
                        </p>
                        <button
                            onClick={() => navigate('/arena?tab=journal')}
                            className="hidden md:block bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full px-8 py-4 text-lg transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:bg-violet-500 transform hover:-translate-y-1"
                        >
                            수련일지 쓰기
                        </button>
                    </div>

                    {/* 2. Visuals (Right) */}
                    <div className="w-full md:w-1/2 flex flex-col gap-6 relative">

                        {/* Visual Element A: Grass (Contribution Grid) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="w-full p-6 rounded-2xl bg-zinc-950/50 backdrop-blur-xl border border-zinc-800 shadow-2xl relative overflow-hidden group hover:border-violet-500/30 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-zinc-400">Annual Activity</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded bg-zinc-900"></div>
                                    <div className="w-2 h-2 rounded bg-violet-900"></div>
                                    <div className="w-2 h-2 rounded bg-violet-700"></div>
                                    <div className="w-2 h-2 rounded bg-violet-500"></div>
                                </div>
                            </div>

                            {/* CSS Grid for Grass */}
                            <div className="grid grid-rows-7 grid-flow-col gap-1 w-full h-[140px] md:h-[160px]">
                                {grassData.map((isActive, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-sm w-full h-full transition-all duration-300 ${isActive
                                            ? 'bg-violet-500 shadow-[0_0_4px_rgba(124,58,237,0.5)]'
                                            : 'bg-zinc-900'
                                            } hover:scale-125 hover:z-10`}
                                        title={isActive ? 'Training Day' : 'Rest Day'}
                                    ></div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Visual Element B: Graph (LineChart) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="w-full h-[240px] p-6 rounded-2xl bg-zinc-950/50 backdrop-blur-xl border border-zinc-800 shadow-2xl relative hover:border-violet-500/30 transition-colors"
                        >
                            <div className="absolute top-6 left-6 z-10">
                                <span className="text-sm font-bold text-zinc-400 block mb-1">Growth Index</span>
                                <span className="text-2xl font-black text-white">Top 1%</span>
                            </div>

                            <div className="w-full h-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <defs>
                                            <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Mobile Only Button */}
                        <button
                            onClick={() => navigate('/arena?tab=journal')}
                            className="md:hidden w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full px-8 py-4 text-lg transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:bg-violet-500"
                        >
                            수련일지 쓰기
                        </button>

                    </div>

                </div>
            </div>
        </section>
    );
};
