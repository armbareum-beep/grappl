import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import { Brain, ChevronRight, Zap, Target } from 'lucide-react';

export const AICoachWidget: React.FC = () => {
    const navigate = useNavigate();

    // Mock data for the mini radar chart
    const radarData = [
        { subject: 'STR', A: 80, fullMark: 100 },
        { subject: 'AGI', A: 65, fullMark: 100 },
        { subject: 'TEC', A: 90, fullMark: 100 },
        { subject: 'DEF', A: 70, fullMark: 100 },
        { subject: 'MIND', A: 85, fullMark: 100 },
    ];

    return (
        <div
            onClick={() => navigate('/ai-coach')}
            className="lg:col-span-5 relative overflow-hidden bg-zinc-900 border border-zinc-800 p-0 rounded-[32px] group flex flex-col h-full cursor-pointer transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_50px_-10px_rgba(124,58,237,0.2)]"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-zinc-900 to-zinc-950 z-0" />
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-600/20 blur-[100px] rounded-full group-hover:bg-violet-600/30 transition-all duration-700" />

            <div className="relative z-10 flex flex-col h-full p-6 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <Brain className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-0.5">AI Coach Intelligence</div>
                            <h3 className="text-lg font-black text-white leading-none">Combat Profile</h3>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                    </div>
                </div>

                {/* Content Content */}
                <div className="flex-1 flex flex-col md:flex-row items-center gap-6">
                    {/* Left: Text Info */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Your Style</p>
                            <h4 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 leading-tight">
                                The Tactical<br />
                                <span className="text-violet-400">Smasher</span>
                            </h4>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between md:justify-start gap-4 px-3 py-2 bg-zinc-950/50 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-xs text-zinc-300 font-medium">Top Position</span>
                                </div>
                                <span className="text-sm font-bold text-white">82%</span>
                            </div>
                            <div className="flex items-center justify-between md:justify-start gap-4 px-3 py-2 bg-zinc-950/50 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-xs text-zinc-300 font-medium">Sub Rate</span>
                                </div>
                                <span className="text-sm font-bold text-white">45%</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Mini Radar */}
                    <div className="w-32 h-32 md:w-40 md:h-40 relative flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={false} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="My Power"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="#8b5cf6"
                                    fillOpacity={0.4}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                        {/* Overlay Flash */}
                        <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl animate-pulse-slow pointer-events-none" />
                    </div>
                </div>

                {/* Footer Text */}
                <p className="mt-6 text-xs text-zinc-500 text-center md:text-left leading-relaxed">
                    <strong className="text-violet-400">Analysis:</strong> You excel at pressure passing but struggle with guard retention under stress.
                </p>

                {/* CTA Button (Mobile only mostly, or subtle) */}
                {/* <button className="w-full mt-4 py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-zinc-200 transition-colors md:hidden">
           View Full Report
        </button> */}
            </div>
        </div>
    );
};
