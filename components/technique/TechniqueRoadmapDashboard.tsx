import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TechniqueSkillTree } from './TechniqueSkillTree';

export const TechniqueRoadmapDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-50 bg-slate-950">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start pointer-events-none">
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto p-2 rounded-full bg-slate-800/50 backdrop-blur-sm text-white hover:bg-slate-700/50 border border-white/10"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>
            <TechniqueSkillTree />
        </div>
    );
};
