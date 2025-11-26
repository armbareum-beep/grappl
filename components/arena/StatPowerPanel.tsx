import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Info } from 'lucide-react';

interface StatBarProps {
    label: string;
    value: number;
    color: string;
    description: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, color, description }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedValue(value);
        }, 100);
        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div
            className="mb-6 relative group"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-300 flex items-center gap-2 cursor-help">
                    {label}
                    <Info className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="text-xs font-mono text-white">{value}</span>
            </div>

            {/* Progress Bar Container */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                {/* Background Glow */}
                <div
                    className="absolute inset-0 opacity-20 blur-sm transition-all duration-1000"
                    style={{ backgroundColor: color, width: `${animatedValue}%` }}
                ></div>

                {/* Main Bar */}
                <div
                    className="h-full rounded-full relative transition-all duration-1000 ease-out"
                    style={{ width: `${animatedValue}%`, backgroundColor: color }}
                >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-shimmer"></div>
                </div>
            </div>

            {/* Circular Indicator at the end */}
            <div
                className="absolute top-6 w-4 h-4 -ml-2 rounded-full border-2 border-slate-900 shadow-lg transition-all duration-1000 ease-out flex items-center justify-center z-10"
                style={{ left: `${animatedValue}%`, backgroundColor: color }}
            >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-800 text-xs text-slate-300 rounded-xl border border-slate-700 shadow-xl z-20 animate-fade-in pointer-events-none">
                    <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-slate-800 border-b border-r border-slate-700 transform rotate-45"></div>
                    <p className="font-semibold text-white mb-1">{label}</p>
                    {description}
                </div>
            )}
        </div>
    );
};

export const StatPowerPanel: React.FC = () => {
    const stats = [
        { label: 'Standing', value: 65, color: '#8b5cf6', description: '테이크다운 및 스탠딩 공방 능력' },
        { label: 'Guard', value: 72, color: '#3b82f6', description: '가드 유지 및 서브미션 세팅 능력' },
        { label: 'Guard Pass', value: 58, color: '#06b6d4', description: '상대의 가드를 뚫고 포지션을 점유하는 능력' },
        { label: 'Side', value: 80, color: '#10b981', description: '사이드 포지션에서의 압박 및 공격 능력' },
        { label: 'Mount', value: 45, color: '#f59e0b', description: '마운트 포지션 유지 및 피니시 능력' },
        { label: 'Back', value: 55, color: '#ef4444', description: '백 포지션 점유 및 초크/암바 결정력' },
    ];

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden group hover:border-purple-500/20 transition-colors duration-500">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                        전투력 지수
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">카테고리별 실력 분석</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-white tracking-tighter drop-shadow-lg">375</div>
                    <div className="text-xs font-bold text-green-400 flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        일일 보너스 +0.5 XP
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                {stats.map((stat) => (
                    <StatBar key={stat.label} {...stat} />
                ))}
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};
