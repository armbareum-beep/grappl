import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TechniqueSkillTree } from './TechniqueSkillTree';
import { ArrowLeft } from 'lucide-react';

export const TechniqueRoadmapDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // 모바일 감지
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // 로딩 완료
        setLoading(false);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []); // 의존성 배열 비움 - 초기 렌더링 시 한 번만 실행

    // Allow non-logged-in users to use the skill tree

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // 모바일에서는 전체화면으로 표시
    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col md:relative md:z-auto">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start bg-gradient-to-b from-slate-950/60 to-transparent pointer-events-none md:hidden">
                    <button
                        onClick={() => navigate(-1)}
                        className="pointer-events-auto p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="pointer-events-auto font-bold text-lg text-white drop-shadow-md">
                        테크닉 로드맵
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Skill Tree Content */}
                <div className="flex-1 overflow-hidden">
                    <TechniqueSkillTree />
                </div>
            </div>
        );
    }

    return (
        <TechniqueSkillTree />
    );
};
