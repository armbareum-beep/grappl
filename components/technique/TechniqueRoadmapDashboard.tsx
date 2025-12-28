import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TechniqueSkillTree } from './TechniqueSkillTree';

export const TechniqueRoadmapDashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">로그인이 필요합니다</h2>
                    <p className="text-slate-400 mb-6">기술 로드맵을 확인하려면 로그인하세요.</p>
                    <Link to="/login">
                        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold">
                            로그인하기
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <TechniqueSkillTree />
    );
};
