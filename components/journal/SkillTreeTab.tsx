import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getUserTechniqueMastery,
    getUserTechniqueSummary,
    getTechniques
} from '../../lib/api-technique-mastery';
import {
    UserTechniqueMastery,
    TechniqueSummary,
    TechniqueCategory,
    Technique
} from '../../types';
import { TechniqueGrid } from '../technique/TechniqueCard';
import { Shield, Swords, Users, Mountain, Target, User2, TrendingUp, TrendingDown, Trophy, Lock, Sparkles } from 'lucide-react';

const CATEGORIES: { name: TechniqueCategory; icon: any; color: string; bgColor: string }[] = [
    { name: 'Standing', icon: User2, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
    { name: 'Guard', icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { name: 'Guard Pass', icon: Swords, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { name: 'Side', icon: Users, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { name: 'Mount', icon: Mountain, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    { name: 'Back', icon: Target, color: 'text-red-400', bgColor: 'bg-red-500/10' }
];

export const SkillTreeTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<TechniqueCategory>('Standing');
    const [masteries, setMasteries] = useState<UserTechniqueMastery[]>([]);
    const [summary, setSummary] = useState<TechniqueSummary[]>([]);
    const [allTechniques, setAllTechniques] = useState<Technique[]>([]);

    useEffect(() => {
        if (user) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        const [masteriesRes, summaryRes, techniquesRes] = await Promise.all([
            getUserTechniqueMastery(user.id),
            getUserTechniqueSummary(user.id),
            getTechniques()
        ]);

        if (masteriesRes.data) setMasteries(masteriesRes.data);
        if (summaryRes.data) setSummary(summaryRes.data);
        if (techniquesRes.data) setAllTechniques(techniquesRes.data);

        setLoading(false);
    };

    const handleTechniqueClick = (mastery: UserTechniqueMastery) => {
        navigate(`/technique/${mastery.techniqueId}`);
    };

    const categoryMasteries = masteries.filter(m => m.technique?.category === selectedCategory);
    const categorySummary = summary.find(s => s.category === selectedCategory);

    // Get strongest and weakest techniques
    const sortedByLevel = [...masteries].sort((a, b) => {
        if (b.masteryLevel !== a.masteryLevel) {
            return b.masteryLevel - a.masteryLevel;
        }
        return b.masteryXp - a.masteryXp;
    });
    const strongestTechniques = sortedByLevel.slice(0, 3);
    const weakestTechniques = sortedByLevel.slice(-3).reverse();

    // Calculate overall progress
    const totalXp = summary.reduce((acc, s) => acc + s.totalXp, 0);
    const totalMastered = summary.reduce((acc, s) => acc + s.masteredTechniques, 0);
    const totalTechniques = summary.reduce((acc, s) => acc + s.totalTechniques, 0);

    if (!user) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">로그인이 필요합니다</h2>
                    <p className="text-slate-600 mb-6">기술 로드맵을 확인하려면 로그인하세요.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-8 h-8 text-yellow-500" />
                    <h1 className="text-3xl font-black text-slate-900">기술 로드맵</h1>
                </div>
                <p className="text-slate-600">나만의 주짓수 기술 마스터리를 추적하고 성장하세요</p>
            </div>

            {/* Dashboard Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total XP */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-blue-900">{totalXp.toLocaleString()}</div>
                            <div className="text-xs text-blue-600">Total XP</div>
                        </div>
                    </div>
                </div>

                {/* Mastered Techniques */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-green-900">{totalMastered}</div>
                            <div className="text-xs text-green-600">마스터한 기술</div>
                        </div>
                    </div>
                </div>

                {/* Total Techniques */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-purple-900">{totalTechniques}</div>
                            <div className="text-xs text-purple-600">등록된 기술</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Strongest & Weakest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Strongest */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        최강 기술 Top 3
                    </h3>
                    <div className="space-y-3">
                        {strongestTechniques.length === 0 ? (
                            <p className="text-slate-500 text-sm">아직 기술이 없습니다.</p>
                        ) : (
                            strongestTechniques.map((mastery, idx) => (
                                <button
                                    key={mastery.id}
                                    onClick={() => handleTechniqueClick(mastery)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-slate-900 font-medium">{mastery.technique?.name}</div>
                                        <div className="text-xs text-slate-500">Lv.{mastery.masteryLevel} • {mastery.masteryXp} XP</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Weakest */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-orange-500" />
                        집중 훈련 필요 Top 3
                    </h3>
                    <div className="space-y-3">
                        {weakestTechniques.length === 0 ? (
                            <p className="text-slate-500 text-sm">아직 기술이 없습니다.</p>
                        ) : (
                            weakestTechniques.map((mastery, idx) => (
                                <button
                                    key={mastery.id}
                                    onClick={() => handleTechniqueClick(mastery)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-slate-900 font-medium">{mastery.technique?.name}</div>
                                        <div className="text-xs text-slate-500">Lv.{mastery.masteryLevel} • {mastery.masteryXp} XP</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.name;
                    const catSummary = summary.find(s => s.category === cat.name);

                    return (
                        <button
                            key={cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`p-4 rounded-xl border-2 transition-all ${isSelected
                                    ? `${cat.bgColor} border-transparent shadow-lg`
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? cat.color : 'text-slate-400'}`} />
                            <div className={`text-sm font-bold mb-1 ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                {cat.name}
                            </div>
                            <div className="text-xs text-slate-500">
                                {catSummary?.masteredTechniques || 0}/{catSummary?.totalTechniques || 0}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Category Summary */}
            {categorySummary && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">등록된 기술</div>
                            <div className="text-2xl font-bold text-slate-900">{categorySummary.totalTechniques}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">마스터</div>
                            <div className="text-2xl font-bold text-green-600">{categorySummary.masteredTechniques}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">평균 레벨</div>
                            <div className="text-2xl font-bold text-blue-600">{categorySummary.avgMasteryLevel.toFixed(1)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Total XP</div>
                            <div className="text-2xl font-bold text-yellow-600">{categorySummary.totalXp.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Technique Grid */}
            <TechniqueGrid
                masteries={categoryMasteries}
                onTechniqueClick={handleTechniqueClick}
                emptyMessage={`${selectedCategory} 카테고리에 등록된 기술이 없습니다.`}
            />
        </div>
    );
};
