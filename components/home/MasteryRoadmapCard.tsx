import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network } from 'lucide-react';
import { UserTechniqueMastery } from '../../types';

interface RoadmapCardData {
    treeId: string;
    treeTitle: string;
    nodeId: string;
    techniqueId: string;
    title: string;
    mastery?: UserTechniqueMastery;
}

interface MasteryRoadmapCardProps {
    roadmap: RoadmapCardData;
}

export const MasteryRoadmapCard: React.FC<MasteryRoadmapCardProps> = ({ roadmap }) => {
    const navigate = useNavigate();

    const progress = roadmap.mastery ? roadmap.mastery.progressPercent : 0;
    const level = roadmap.mastery ? roadmap.mastery.masteryLevel : 1;

    return (
        <div
            onClick={() => navigate(`/skill-tree?id=${roadmap.treeId}`)}
            className="group relative w-[280px] md:w-[320px] aspect-[16/9] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-[#121215] transition-all duration-300 hover:scale-105 hover:z-20"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-900/10 blur-[40px] rounded-full group-hover:bg-violet-900/20 transition-all pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full justify-between p-4 md:p-5">
                <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-300 flex items-center gap-1 uppercase tracking-wider">
                        <Network className="w-2.5 h-2.5" />
                        Current Goal
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <h3 className="text-lg md:text-xl font-black text-white truncate group-hover:text-violet-200 transition-colors">
                        {roadmap.title}
                    </h3>
                    <p className="text-zinc-500 text-[11px] font-bold truncate">
                        {roadmap.treeTitle}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-zinc-300">Level {level}</span>
                        <span className="text-zinc-500">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                            style={{ width: `${Math.max(progress, 5)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Play Overlay (Removed text logic here as it's inside) */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};
